import { describe, expect, it } from 'vitest'
import {
  PLAN_TEMPLATE_VERSION,
  PlanTemplateError,
  parsePlanTemplateJson,
  type PlanTemplatePayload,
} from './plan-template'

function samplePayload(overrides: Partial<PlanTemplatePayload> = {}): PlanTemplatePayload {
  return {
    version: PLAN_TEMPLATE_VERSION,
    exportedAt: '2026-07-11T00:00:00.000Z',
    name: 'JLPT N2',
    description: 'Sample plan',
    startDate: '2026-08-03',
    targetDate: '2026-12-06',
    sourceTemplateId: 'jlpt-n2',
    materials: [{ name: 'Bunpou', unitLabel: 'chapter', totalUnits: 10, tags: ['grammar'] }],
    schedule: [{ weekday: 1, title: 'Grammar', materialIndex: 0 }],
    checkpoints: [{ title: 'Mock 1', dueDate: '2026-10-01' }],
    ...overrides,
  }
}

describe('parsePlanTemplateJson', () => {
  it('parses a valid payload', () => {
    const payload = samplePayload()
    expect(parsePlanTemplateJson(JSON.stringify(payload))).toEqual(payload)
  })

  it('preserves sourceTemplateId', () => {
    const payload = samplePayload({ sourceTemplateId: 'toeic-800' })
    expect(parsePlanTemplateJson(JSON.stringify(payload)).sourceTemplateId).toBe('toeic-800')
  })

  it('rejects invalid json', () => {
    expect(() => parsePlanTemplateJson('not-json')).toThrow(PlanTemplateError)
  })

  it('rejects target date before start date', () => {
    const payload = samplePayload({ startDate: '2026-12-01', targetDate: '2026-08-01' })
    expect(() => parsePlanTemplateJson(JSON.stringify(payload))).toThrow(PlanTemplateError)
  })

  it('rejects invalid material index in schedule', () => {
    const payload = samplePayload({
      schedule: [{ weekday: 2, title: 'Reading', materialIndex: 5 }],
    })
    expect(() => parsePlanTemplateJson(JSON.stringify(payload))).toThrow(PlanTemplateError)
  })
})
