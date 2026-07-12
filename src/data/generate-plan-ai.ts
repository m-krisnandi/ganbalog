import type { PlanTemplatePayload } from './plan-template'
import { getSupabaseClient } from './supabase/client'

export type AiPlanIntensity = 'light' | 'standard' | 'intense'

export interface GeneratePlanAiInput {
  goal: string
  description?: string
  startDate: string
  targetDate: string
  weekdays: number[]
  intensity?: AiPlanIntensity
  locale?: string
}

export class GeneratePlanAiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = 'GeneratePlanAiError'
  }
}

export async function generatePlanWithAi(input: GeneratePlanAiInput): Promise<PlanTemplatePayload> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new GeneratePlanAiError('Sign in required', 'unauthorized')
  }

  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      goal: input.goal.trim(),
      description: input.description?.trim() ?? '',
      startDate: input.startDate,
      targetDate: input.targetDate,
      weekdays: input.weekdays,
      intensity: input.intensity ?? 'standard',
      locale: input.locale ?? 'en',
    }),
  })

  const raw = await response.text()
  let body: { payload?: PlanTemplatePayload; error?: string } = {}
  try {
    body = raw ? (JSON.parse(raw) as { payload?: PlanTemplatePayload; error?: string }) : {}
  } catch {
    throw new GeneratePlanAiError(
      'AI API is not available on this host. Redeploy to Vercel with OPENAI_API_KEY, or run vercel dev locally.',
      'api_unavailable',
    )
  }

  if (!response.ok) {
    throw new GeneratePlanAiError(body.error ?? 'generate_failed', body.error ?? 'generate_failed')
  }
  if (!body.payload) {
    throw new GeneratePlanAiError('empty_payload', 'empty_payload')
  }
  return body.payload
}
