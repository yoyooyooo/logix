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

describe('contracts (036): workbench contract suite', () => {
  it('parses all schemas and keeps title/$ref aligned', () => {
    const schemasDirUrl = new URL('../../../../specs/036-workbench-contract-suite/contracts/schemas/', import.meta.url)

    const expectedTitles: Record<string, string> = {
      'contract-suite-verdict.schema.json': 'ContractSuiteVerdict',
      'contract-suite-context-pack.schema.json': 'ContractSuiteContextPack',
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

    const contextPack = schemas.get('contract-suite-context-pack.schema.json')!.schema
    expect(contextPack.properties?.verdict?.$ref).toBe('./contract-suite-verdict.schema.json')
    expect(contextPack.properties?.facts?.properties?.trialRunReport?.$ref).toBe(
      '../../../025-ir-reflection-loader/contracts/schemas/trial-run-report.schema.json',
    )

    const verdict = schemas.get('contract-suite-verdict.schema.json')!.schema
    expect(verdict.properties?.reasons?.items?.properties?.details?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )
  })
})

