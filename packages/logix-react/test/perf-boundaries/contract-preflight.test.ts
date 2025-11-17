import { test, expect } from 'vitest'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import perfReportSchema from '@logix/perf-evidence/assets/schemas/perf-report.schema.json'
import perfDiffSchema from '@logix/perf-evidence/assets/schemas/perf-diff.schema.json'

const PREFLIGHT = process.env.LOGIX_PREFLIGHT === '1'

const parseRef = (ref: string): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {}
  for (const part of ref.split('&')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (!k) continue

    if (v === 'true') out[k] = true
    else if (v === 'false') out[k] = false
    else if (/^-?\\d+(\\.\\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

const preflight = PREFLIGHT ? test : test.skip

preflight('perf contracts: matrix invariants', () => {
  const suites = (matrix as any).suites as ReadonlyArray<any>
  expect(Array.isArray(suites)).toBe(true)

  const ids = new Set<string>()
  for (const suite of suites) {
    expect(typeof suite.id).toBe('string')
    expect(suite.id.length).toBeGreaterThan(0)
    expect(ids.has(suite.id)).toBe(false)
    ids.add(suite.id)

    expect(typeof suite.primaryAxis).toBe('string')
    expect(suite.primaryAxis.length).toBeGreaterThan(0)

    const axes = suite.axes as Record<string, ReadonlyArray<unknown>>
    expect(axes && typeof axes === 'object').toBe(true)
    expect(Array.isArray(axes[suite.primaryAxis])).toBe(true)
    expect((axes[suite.primaryAxis] as any[]).length).toBeGreaterThan(0)

    for (const [axis, levels] of Object.entries(axes)) {
      expect(typeof axis).toBe('string')
      expect(axis.length).toBeGreaterThan(0)
      expect(Array.isArray(levels)).toBe(true)
      expect(levels.length).toBeGreaterThan(0)
    }

    const metrics = suite.metrics as ReadonlyArray<string>
    expect(Array.isArray(metrics)).toBe(true)
    expect(metrics.length).toBeGreaterThan(0)

    const budgets = (suite.budgets ?? []) as ReadonlyArray<any>
    for (const b of budgets) {
      expect(typeof b.type).toBe('string')
      expect(typeof b.metric).toBe('string')
      expect(metrics.includes(b.metric)).toBe(true)

      if (b.type === 'relative') {
        const num = parseRef(String(b.numeratorRef))
        const den = parseRef(String(b.denominatorRef))

        expect(Object.keys(num).length).toBeGreaterThan(0)
        expect(Object.keys(den).length).toBeGreaterThan(0)

        for (const [k, v] of Object.entries({ ...num, ...den })) {
          expect(Array.isArray(axes[k])).toBe(true)
          expect((axes[k] as any[]).includes(v)).toBe(true)
        }
      }
    }

    const comparisons = (suite.comparisons ?? []) as ReadonlyArray<any>
    for (const c of comparisons) {
      expect(typeof c.kind).toBe('string')
      expect(typeof c.metric).toBe('string')
      expect(metrics.includes(c.metric)).toBe(true)

      const num = parseRef(String(c.numeratorRef))
      const den = parseRef(String(c.denominatorRef))
      for (const [k, v] of Object.entries({ ...num, ...den })) {
        expect(Array.isArray(axes[k])).toBe(true)
        expect((axes[k] as any[]).includes(v)).toBe(true)
      }
    }
  }
})

preflight('perf contracts: schema surface sanity', () => {
  expect((perfReportSchema as any).$schema).toContain('json-schema')
  expect((perfReportSchema as any).title).toBe('LogixPerfReport')
  expect((perfReportSchema as any).type).toBe('object')
  expect((perfReportSchema as any).$defs?.SuiteResult).toBeTruthy()
  expect((perfReportSchema as any).$defs?.PointResult).toBeTruthy()
  expect((perfReportSchema as any).$defs?.Threshold).toBeTruthy()

  expect((perfDiffSchema as any).$schema).toContain('json-schema')
  expect((perfDiffSchema as any).title).toBe('LogixPerfDiff')
  expect((perfDiffSchema as any).type).toBe('object')
  expect((perfDiffSchema as any).$defs?.SuiteDiff).toBeTruthy()

  expect((perfDiffSchema as any).$defs?.Budget?.$ref).toBe('./perf-report.schema.json#/$defs/Budget')
})
