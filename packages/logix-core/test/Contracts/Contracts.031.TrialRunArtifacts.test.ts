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

describe('contracts (031): trial-run artifacts', () => {
  it('parses all schemas and keeps title/$ref aligned', () => {
    const schemasDirUrl = new URL('../../../../specs/031-trialrun-artifacts/contracts/schemas/', import.meta.url)

    const expectedTitles: Record<string, string> = {
      'trial-run-artifacts.schema.json': 'TrialRunArtifacts',
      'artifact-envelope.schema.json': 'ArtifactEnvelope',
      'form-rules-manifest-artifact.schema.json': 'FormRulesManifestArtifactPayload',
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

    const artifactEnvelope = schemas.get('artifact-envelope.schema.json')!.schema
    expect(artifactEnvelope.properties?.value?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )
    expect(artifactEnvelope.properties?.notes?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )
    expect(artifactEnvelope.properties?.error?.$ref).toBe(
      '../../../016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json',
    )

    const formRules = schemas.get('form-rules-manifest-artifact.schema.json')!.schema
    expect(formRules.properties?.manifest?.$ref).toBe(
      '../../../028-form-api-dx/contracts/schemas/rules-manifest.schema.json',
    )
  })
})
