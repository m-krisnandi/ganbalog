import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

type Intensity = 'light' | 'standard' | 'intense'

interface GenerateBody {
  goal?: string
  description?: string
  startDate?: string
  targetDate?: string
  weekdays?: number[]
  intensity?: Intensity
  locale?: string
}

interface PlanTemplatePayload {
  version: 1
  exportedAt: string
  name: string
  description: string
  startDate: string
  targetDate: string
  sourceTemplateId: string | null
  materials: Array<{
    name: string
    unitLabel: string
    totalUnits: number
    tags: string[]
  }>
  schedule: Array<{
    weekday: number
    title: string
    materialIndex: number | null
  }>
  checkpoints: Array<{ title: string; dueDate: string }>
}

const ALLOWED_TAGS = new Set([
  'grammar',
  'vocab',
  'kanji',
  'reading',
  'listening',
  'mock',
  'other',
])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin ?? '*'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value)
  }
  return new Response(response.body, { status: response.status, headers })
}

async function verifyUser(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7).trim()
  if (!token) return false

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return false

  const supabase = createClient(url, key)
  const { data, error } = await supabase.auth.getUser(token)
  return !error && Boolean(data.user)
}

function normalizeWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const set = new Set<number>()
  for (const value of raw) {
    const n = Number(value)
    if (Number.isInteger(n) && n >= 1 && n <= 7) set.add(n)
  }
  return [...set].sort((a, b) => a - b)
}

function intensityHint(intensity: Intensity): string {
  switch (intensity) {
    case 'light':
      return 'Light load: 3–5 materials, modest unit counts, 1 schedule item per study day, 3–4 milestones.'
    case 'intense':
      return 'Intense load: 6–10 materials, higher unit counts, 2 schedule items per study day when useful, 5–8 milestones.'
    default:
      return 'Standard load: 4–7 materials, balanced units, 1–2 schedule items per study day, 4–6 milestones.'
  }
}

function buildSystemPrompt(): string {
  return `You are a study coach that builds structured study plans for GanbaLog.
Return ONLY valid JSON matching this schema (no markdown):
{
  "name": string,
  "description": string,
  "materials": [{ "name": string, "unitLabel": string, "totalUnits": integer, "tags": string[] }],
  "schedule": [{ "weekday": 1-7, "title": string, "materialIndex": integer|null }],
  "checkpoints": [{ "title": string, "dueDate": "YYYY-MM-DD" }]
}
Rules:
- weekday uses ISO: 1=Monday … 7=Sunday. ONLY use weekdays from the user's studyDays list. Never use 0-based Sunday indexing.
- You MUST include at least one schedule entry for EVERY number in studyDays. If studyDays includes 6 and 7, Saturday and Sunday MUST have study items — they are NOT rest days.
- Do not invent rest days. Omitting a weekday from the schedule is wrong when that weekday is in studyDays.
- materialIndex is 0-based index into materials, or null if not linked.
- tags must be a subset of: grammar, vocab, kanji, reading, listening, mock, other.
- totalUnits integer 1–500.
- checkpoints.dueDate must fall between startDate and targetDate inclusive.
- schedule should cover each study day with realistic recurring weekly items (not one-off dated tasks).
- Keep materials.length ≤ 12, schedule.length ≤ 28, checkpoints.length ≤ 10.
- Materials may mix books, YouTube channels/playlists, apps (Bunpro, Anki), podcasts, courses. Pick unitLabel to match (chapters, videos, lessons, items, episodes…).
- If the user names specific sources, prefer those; otherwise suggest a realistic mix for the goal.
- Write content in the user's locale language when possible.`
}

function buildUserPrompt(body: {
  goal: string
  description: string
  startDate: string
  targetDate: string
  weekdays: number[]
  intensity: Intensity
  locale: string
}): string {
  const dayNames: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  }
  return JSON.stringify(
    {
      goal: body.goal,
      extraContext: body.description || null,
      startDate: body.startDate,
      targetDate: body.targetDate,
      studyDays: body.weekdays,
      studyDayNames: body.weekdays.map((d) => dayNames[d] ?? String(d)),
      mustScheduleEveryStudyDay: true,
      intensity: body.intensity,
      intensityGuidance: intensityHint(body.intensity),
      locale: body.locale,
    },
    null,
    2,
  )
}

function sanitizePayload(
  raw: unknown,
  input: { startDate: string; targetDate: string; weekdays: number[]; goal: string; description: string },
): PlanTemplatePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>

  const name =
    typeof data.name === 'string' && data.name.trim()
      ? data.name.trim().slice(0, 120)
      : input.goal.slice(0, 120)
  const description =
    typeof data.description === 'string' ? data.description.trim().slice(0, 2000) : input.description

  if (!Array.isArray(data.materials) || !Array.isArray(data.schedule) || !Array.isArray(data.checkpoints)) {
    return null
  }

  const materials: PlanTemplatePayload['materials'] = []
  for (const item of data.materials.slice(0, 100)) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const mName = typeof m.name === 'string' ? m.name.trim().slice(0, 160) : ''
    const unitLabel = typeof m.unitLabel === 'string' ? m.unitLabel.trim().slice(0, 40) : 'units'
    const totalUnits = Number(m.totalUnits)
    if (!mName || !Number.isInteger(totalUnits) || totalUnits < 1 || totalUnits > 100_000) continue
    const tags = Array.isArray(m.tags)
      ? m.tags
          .filter((tag): tag is string => typeof tag === 'string' && ALLOWED_TAGS.has(tag))
          .slice(0, 10)
      : []
    materials.push({ name: mName, unitLabel: unitLabel || 'units', totalUnits, tags })
  }

  if (materials.length === 0) return null

  const weekdaySet = new Set(input.weekdays)
  const schedule: PlanTemplatePayload['schedule'] = []
  for (const item of data.schedule.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const weekday = normalizeAiWeekday(Number(s.weekday))
    const title = typeof s.title === 'string' ? s.title.trim().slice(0, 200) : ''
    if (!title || weekday === null || !weekdaySet.has(weekday)) continue
    let materialIndex: number | null = null
    if (s.materialIndex !== null && s.materialIndex !== undefined) {
      const idx = Number(s.materialIndex)
      if (Number.isInteger(idx) && idx >= 0 && idx < materials.length) materialIndex = idx
    }
    schedule.push({ weekday, title, materialIndex })
  }

  ensureScheduleCoversStudyDays(schedule, input.weekdays, materials.length)

  const checkpoints: PlanTemplatePayload['checkpoints'] = []
  for (const item of data.checkpoints.slice(0, 100)) {
    if (!item || typeof item !== 'object') continue
    const c = item as Record<string, unknown>
    const title = typeof c.title === 'string' ? c.title.trim().slice(0, 200) : ''
    const dueDate = typeof c.dueDate === 'string' ? c.dueDate : ''
    if (!title || !DATE_RE.test(dueDate)) continue
    if (dueDate < input.startDate || dueDate > input.targetDate) continue
    checkpoints.push({ title, dueDate })
  }

  if (schedule.length === 0 || checkpoints.length === 0) return null

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    name,
    description,
    startDate: input.startDate,
    targetDate: input.targetDate,
    sourceTemplateId: 'ai',
    materials,
    schedule,
    checkpoints,
  }
}

/** Accept ISO 1–7, or 0 = Sunday (JS-style) remapped to 7. */
function normalizeAiWeekday(raw: number): number | null {
  if (!Number.isInteger(raw)) return null
  if (raw >= 1 && raw <= 7) return raw
  if (raw === 0) return 7
  return null
}

/**
 * Models often skip weekends even when studyDays includes them.
 * Fill any missing selected day by rotating titles from days that already have items.
 */
function ensureScheduleCoversStudyDays(
  schedule: PlanTemplatePayload['schedule'],
  studyDays: number[],
  materialCount: number,
): void {
  const covered = new Set(schedule.map((item) => item.weekday))
  const donors = schedule.filter((item) => studyDays.includes(item.weekday))
  let donorIndex = 0

  for (const day of studyDays) {
    if (covered.has(day)) continue

    if (donors.length > 0) {
      const donor = donors[donorIndex % donors.length]!
      donorIndex += 1
      schedule.push({
        weekday: day,
        title: donor.title,
        materialIndex: donor.materialIndex,
      })
    } else {
      schedule.push({
        weekday: day,
        title: 'Study session',
        materialIndex: materialCount > 0 ? 0 : null,
      })
    }
    covered.add(day)
  }

  schedule.sort((a, b) => a.weekday - b.weekday || a.title.localeCompare(b.title))
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), origin)
  }

  if (request.method !== 'POST') {
    return withCors(json(405, { error: 'method_not_allowed' }), origin)
  }

  const authorized = await verifyUser(request.headers.get('authorization'))
  if (!authorized) {
    return withCors(json(401, { error: 'unauthorized' }), origin)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return withCors(json(503, { error: 'openai_not_configured' }), origin)
  }

  let body: GenerateBody
  try {
    body = (await request.json()) as GenerateBody
  } catch {
    return withCors(json(400, { error: 'invalid_json' }), origin)
  }

  const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const targetDate = typeof body.targetDate === 'string' ? body.targetDate : ''
  const weekdays = normalizeWeekdays(body.weekdays)
  const intensity: Intensity =
    body.intensity === 'light' || body.intensity === 'intense' ? body.intensity : 'standard'
  const locale = typeof body.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'en'

  if (!goal || goal.length > 120) {
    return withCors(json(400, { error: 'invalid_goal' }), origin)
  }
  if (!DATE_RE.test(startDate) || !DATE_RE.test(targetDate) || targetDate < startDate) {
    return withCors(json(400, { error: 'invalid_dates' }), origin)
  }
  if (weekdays.length === 0) {
    return withCors(json(400, { error: 'invalid_weekdays' }), origin)
  }

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPrompt({
            goal,
            description,
            startDate,
            targetDate,
            weekdays,
            intensity,
            locale,
          }),
        },
      ],
    }),
  })

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => '')
    console.error('[generate-plan] OpenAI error', openaiRes.status, detail.slice(0, 500))
    return withCors(json(502, { error: 'openai_failed' }), origin)
  }

  const openaiJson = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = openaiJson.choices?.[0]?.message?.content
  if (!content) {
    return withCors(json(502, { error: 'openai_empty' }), origin)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return withCors(json(502, { error: 'openai_invalid_json' }), origin)
  }

  const payload = sanitizePayload(parsed, {
    startDate,
    targetDate,
    weekdays,
    goal,
    description,
  })
  if (!payload) {
    return withCors(json(502, { error: 'invalid_plan_shape' }), origin)
  }

  return withCors(json(200, { payload }), origin)
}
