import { describe, it, expect } from '@effect/vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

const collectRefs = (value: unknown, out: string[] = []): string[] => {
  if (!value || typeof value !== 'object') {
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, out)
    }
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

describe('contracts (034): code assets & deps', () => {
  it('parses all schemas and keeps title/$ref aligned', () => {
    const schemasDirUrl = new URL('../../../../specs/034-code-asset-protocol/contracts/schemas/', import.meta.url)

    const expectedTitles: Record<string, string> = {
      'code-asset-ref.schema.json': 'CodeAssetRef',
      'code-asset.schema.json': 'CodeAsset',
      'deps.schema.json': 'Deps',
      'reversibility-anchor.schema.json': 'ReversibilityAnchor',
    }

    const schemaFiles = readdirSync(fileURLToPath(schemasDirUrl)).filter((f) => f.endsWith('.schema.json'))
    expect(schemaFiles.sort()).toEqual(Object.keys(expectedTitles).sort())

    const schemas = new Map<string, any>()
    for (const file of schemaFiles) {
      const url = new URL(file, schemasDirUrl)
      const schema = readJson(url)
      schemas.set(file, { schema, url })

      expect(String(schema.$schema)).toContain('json-schema')
      expect(schema.title).toBe(expectedTitles[file])

      const refs = collectRefs(schema)
      for (const ref of refs) {
        if (ref.startsWith('http://') || ref.startsWith('https://')) {
          continue
        }
        const targetUrl = new URL(ref, url)
        expect(existsSync(fileURLToPath(targetUrl))).toBe(true)
      }
    }

    const deps = schemas.get('deps.schema.json')!.schema
    expect(deps.properties?.reads?.items?.allOf?.[0]?.$ref).toBe(
      '../../../035-module-reference-space/contracts/schemas/port-address.schema.json',
    )
    expect(deps.properties?.notes?.$ref).toBe('../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json')

    const codeAsset = schemas.get('code-asset.schema.json')!.schema
    expect(codeAsset.properties?.deps?.$ref).toBe('./deps.schema.json')
    expect(codeAsset.properties?.anchor?.$ref).toBe('./reversibility-anchor.schema.json')
  })
})

