import { describe, it, expect } from '@effect/vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

const collectRefs = (value: unknown, out: string[] = []): string[] => {
  if (!value || typeof value !== 'object') return out
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, out)
    return out
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === '$ref' && typeof v === 'string') {
      out.push(v)
      continue
    }
    collectRefs(v, out)
  }
  return out
}

describe('contracts (084): SpyEvidenceReport@v1', () => {
  it('parses schema JSON and resolves all local $ref', () => {
    const schemaUrl = new URL(
      '../../../../specs/084-loader-spy-dep-capture/contracts/schemas/spy-evidence-report.schema.json',
      import.meta.url,
    )

    const schema = readJson(schemaUrl)
    expect(schema.title).toBe('SpyEvidenceReport@v1')
    expect(String(schema.$schema)).toContain('json-schema')

    const refs = collectRefs(schema)
    for (const ref of refs) {
      if (ref.startsWith('http://') || ref.startsWith('https://')) continue
      const targetUrl = new URL(ref, schemaUrl)
      expect(existsSync(fileURLToPath(targetUrl))).toBe(true)
    }

    expect(schema.$defs?.JsonValue?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )
  })
})

