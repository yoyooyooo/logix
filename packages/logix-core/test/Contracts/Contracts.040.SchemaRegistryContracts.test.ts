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

describe('contracts (040): schema registry pack', () => {
  it('parses all schemas and keeps title/$ref aligned', () => {
    const schemasDirUrl = new URL('../../../../specs/040-schemaast-layered-upgrade/contracts/schemas/', import.meta.url)

    const expectedTitles: Record<string, string> = {
      'schema-registry-pack.schema.json': 'SchemaRegistryPack',
      'schema-ref.schema.json': 'SchemaRef',
      'schema-diff.schema.json': 'SchemaDiff',
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

    const pack = schemas.get('schema-registry-pack.schema.json')!.schema
    expect(pack.properties?.notes?.$ref).toBe('../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json')

    const ref = schemas.get('schema-ref.schema.json')!.schema
    expect(ref.properties?.hint?.$ref).toBe('../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json')

    const diff = schemas.get('schema-diff.schema.json')!.schema
    expect(diff.properties?.notes?.$ref).toBe('../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json')
  })
})

