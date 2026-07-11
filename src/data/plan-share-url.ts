import { queueFlashToast } from '../app/flash-toast'
import type { PlanTemplatePayload } from './plan-template'
import { parsePlanTemplateJson, PlanTemplateError, PLAN_TEMPLATE_VERSION } from './plan-template'

export const PENDING_PLAN_IMPORT_RAW_KEY = 'ganbalog.pendingPlanImportRaw'

/** Conservative limit — many browsers/proxies fail well before 12k query strings. */
const MAX_RAW_PARAM_LENGTH = 12_000
const MAX_SHARE_PARAM_LENGTH = 8_000

/** Capture ?importPlan= from URL before router; decode later in PlanImportHandler. */
export function capturePlanImportFromUrl(): void {
  const raw = new URL(window.location.href).searchParams.get('importPlan')?.trim()
  if (!raw) return
  if (raw.length > MAX_RAW_PARAM_LENGTH) {
    queueFlashToast('settings.importPlanLinkTooLarge', 'error')
    return
  }
  try {
    sessionStorage.setItem(PENDING_PLAN_IMPORT_RAW_KEY, raw)
  } catch {
    queueFlashToast('settings.importPlanLinkInvalid', 'error')
    return
  }
  const url = new URL(window.location.href)
  url.searchParams.delete('importPlan')
  const query = url.searchParams.toString()
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${query ? `?${query}` : ''}${url.hash}`,
  )
}

export function peekPendingPlanImportRaw(): string | null {
  try {
    return sessionStorage.getItem(PENDING_PLAN_IMPORT_RAW_KEY)
  } catch {
    return null
  }
}

export function clearPendingPlanImportRaw(): void {
  try {
    sessionStorage.removeItem(PENDING_PLAN_IMPORT_RAW_KEY)
  } catch {
    /* ignore */
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encodePlanPayloadForUrl(payload: PlanTemplatePayload): Promise<string> {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)

  if (typeof CompressionStream !== 'undefined') {
    const compressed = await new Response(
      new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer()
    const token = `z.${bytesToBase64Url(new Uint8Array(compressed))}`
    if (token.length > MAX_SHARE_PARAM_LENGTH) {
      throw new PlanTemplateError('tooLarge')
    }
    return token
  }

  const raw = bytesToBase64Url(bytes)
  const token = `r.${raw}`
  if (token.length > MAX_SHARE_PARAM_LENGTH) {
    throw new PlanTemplateError('tooLarge')
  }
  return token
}

export async function decodePlanPayloadFromUrl(encoded: string): Promise<PlanTemplatePayload> {
  const dot = encoded.indexOf('.')
  if (dot <= 0) throw new PlanTemplateError('invalidFormat')
  const mode = encoded.slice(0, dot)
  const data = encoded.slice(dot + 1)
  if (!data) throw new PlanTemplateError('invalidFormat')

  let json: string
  if (mode === 'z') {
    if (typeof DecompressionStream === 'undefined') {
      throw new PlanTemplateError('unsupportedCompression')
    }
    const bytes = base64UrlToBytes(data)
    const decompressed = await new Response(
      new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer()
    json = new TextDecoder().decode(decompressed)
  } else if (mode === 'r') {
    json = new TextDecoder().decode(base64UrlToBytes(data))
  } else {
    throw new PlanTemplateError('invalidFormat')
  }

  const parsed = parsePlanTemplateJson(json)
  if (parsed.version !== PLAN_TEMPLATE_VERSION) throw new PlanTemplateError('unsupportedVersion')
  return parsed
}

export async function buildPlanShareUrl(
  payload: PlanTemplatePayload,
  origin = window.location.origin,
  pathname = '/',
): Promise<string> {
  const token = await encodePlanPayloadForUrl(payload)
  const url = new URL(origin + pathname)
  url.searchParams.set('importPlan', token)
  return url.toString()
}

export async function copyPlanShareLink(payload: PlanTemplatePayload): Promise<string> {
  const link = await buildPlanShareUrl(payload)
  await navigator.clipboard.writeText(link)
  return link
}
