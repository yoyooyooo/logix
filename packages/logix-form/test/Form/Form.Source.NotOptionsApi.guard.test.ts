import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

const forbiddenSourceSurfaceKeys = [
  'options',
  'Options',
  'candidates',
  'Candidates',
  'sourceOptions',
  'SourceOptions',
  'sourceCandidates',
  'SourceCandidates',
  'settlement',
  'Settlement',
  'submitVerdict',
  'SubmitVerdict',
] as const

describe('Form source boundary', () => {
  it('does not expose source as an options/candidates namespace on the public root', () => {
    const root = Form as Record<string, unknown>

    for (const key of forbiddenSourceSurfaceKeys) {
      expect(key in root).toBe(false)
    }
  })

  it('does not publish source/options or source/candidates subpaths', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      readonly exports?: Record<string, unknown>
      readonly publishConfig?: {
        readonly exports?: Record<string, unknown>
      }
    }

    const rootExports = Object.keys(packageJson.exports ?? {})
    const publishExports = Object.keys(packageJson.publishConfig?.exports ?? {})
    const allExports = [...rootExports, ...publishExports]

    for (const subpath of allExports) {
      expect(subpath).not.toMatch(/source.*(options|candidates)|(options|candidates).*source/i)
    }
  })

  it('keeps field(path).source config on remote fact scheduling, not final settlement or candidates', () => {
    const impl = readFileSync(new URL('../../src/internal/form/impl.ts', import.meta.url), 'utf8')
    const start = impl.indexOf('readonly source: (config: {')
    const end = impl.indexOf('}) => void', start)
    const sourceConfig = impl.slice(start, end)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    expect(sourceConfig).toMatch(/\bresource\b/)
    expect(sourceConfig).toMatch(/\bdeps\b/)
    expect(sourceConfig).toMatch(/\bkey\b/)
    expect(sourceConfig).toMatch(/\bsubmitImpact\b/)
    expect(sourceConfig).not.toMatch(/\b(options|candidates|settlement|finalTruth|submitVerdict|errors)\b/i)
  })
})
