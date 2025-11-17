import { describe, it, expect } from '@effect/vitest'
import { readFileSync } from 'node:fs'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

describe('contracts (020): runtime internals contracts', () => {
  it('parses schemas and keeps 005/013 refs aligned', () => {
    const evidencePackage = readJson(
      new URL(
        '../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package.schema.json',
        import.meta.url,
      ),
    )
    const summary = readJson(
      new URL(
        '../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package-summary.schema.json',
        import.meta.url,
      ),
    )
    const servicesEvidence = readJson(
      new URL(
        '../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json',
        import.meta.url,
      ),
    )

    expect(String(evidencePackage.$schema)).toContain('json-schema')
    expect(evidencePackage.title).toBe('RuntimeEvidencePackage')
    expect(evidencePackage.allOf?.[0]?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/evidence-package.schema.json',
    )
    expect(evidencePackage.allOf?.[1]?.properties?.summary?.$ref).toBe('./runtime-evidence-package-summary.schema.json')

    expect(String(summary.$schema)).toContain('json-schema')
    expect(summary.title).toBe('RuntimeEvidencePackageSummary')
    expect(summary.properties?.converge?.$ref).toBe(
      '../../../013-auto-converge-planner/contracts/schemas/converge-evidence-package-summary.schema.json',
    )
    expect(summary.properties?.runtime?.properties?.services?.$ref).toBe('./runtime-services-evidence.schema.json')
    expect(summary.additionalProperties?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )
    expect(summary.properties?.runtime?.additionalProperties?.$ref).toBe(
      '../../../005-unify-observability-protocol/contracts/schemas/json-value.schema.json',
    )

    expect(String(servicesEvidence.$schema)).toContain('json-schema')
    expect(servicesEvidence.title).toBe('RuntimeServicesEvidence')
    expect(servicesEvidence.additionalProperties).toBe(false)

    const required = new Set<string>(servicesEvidence.required ?? [])
    expect(required.has('instanceId')).toBe(true)
    expect(required.has('scope')).toBe(true)
    expect(required.has('bindings')).toBe(true)

    expect(servicesEvidence.properties?.scope?.enum).toEqual([
      'builtin',
      'runtime_default',
      'runtime_module',
      'provider',
      'instance',
    ])

    const bindingRequired = new Set<string>(servicesEvidence.properties?.bindings?.items?.required ?? [])
    expect(bindingRequired.has('serviceId')).toBe(true)
    expect(bindingRequired.has('scope')).toBe(true)
    expect(bindingRequired.has('overridden')).toBe(true)
  })
})
