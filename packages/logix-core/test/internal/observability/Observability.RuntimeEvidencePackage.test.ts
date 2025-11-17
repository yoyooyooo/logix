import { describe, it, expect } from '@effect/vitest'
import { readFileSync } from 'node:fs'
import { isJsonValue } from '../../../src/internal/observability/jsonValue.js'
import { makeRunSession } from '../../../src/internal/observability/runSession.js'
import { makeEvidenceCollector } from '../../../src/internal/observability/evidenceCollector.js'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

describe('Observability.RuntimeEvidencePackage (contracts 020)', () => {
  it('exports a JSON-serializable EvidencePackage with runtime.services summary matching schema', () => {
    const runtimeServicesSchema = readJson(
      new URL(
        '../../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json',
        import.meta.url,
      ),
    )

    const session = makeRunSession({
      runId: 'run-test',
      source: { host: 'vitest', label: 'Observability.RuntimeEvidencePackage' },
    })
    const collector = makeEvidenceCollector(session)

    collector.setRuntimeServicesEvidence({
      moduleId: 'M',
      instanceId: 'i-1',
      scope: 'builtin',
      bindings: [
        {
          serviceId: 'txn',
          implId: 'builtin',
          implVersion: 'v0',
          scope: 'builtin',
          overridden: false,
        },
      ],
      overridesApplied: [],
    })

    const pkg = collector.exportEvidencePackage()
    expect(() => JSON.stringify(pkg)).not.toThrow()

    // ---- Minimal base invariants (005 EvidencePackage surface) ----
    expect(typeof pkg.protocolVersion).toBe('string')
    expect(typeof pkg.runId).toBe('string')
    expect(typeof pkg.createdAt).toBe('number')
    expect(pkg.source && typeof pkg.source.host).toBe('string')
    expect(Array.isArray(pkg.events)).toBe(true)

    for (const e of pkg.events) {
      expect(typeof e.protocolVersion).toBe('string')
      expect(typeof e.runId).toBe('string')
      expect(typeof e.seq).toBe('number')
      expect(typeof e.timestamp).toBe('number')
      expect(typeof e.type).toBe('string')
      expect(isJsonValue(e.payload)).toBe(true)
    }

    // ---- 020 summary.runtime.services contract ----
    const summary: any = pkg.summary
    expect(summary && typeof summary === 'object').toBe(true)
    const services: any = summary?.runtime?.services
    expect(services && typeof services === 'object').toBe(true)

    const required = new Set<string>(runtimeServicesSchema.required ?? [])
    for (const k of required) {
      expect(k in services).toBe(true)
    }

    const scopeEnum = runtimeServicesSchema?.properties?.scope?.enum
    expect(scopeEnum).toContain(services.scope)

    expect(typeof services.instanceId).toBe('string')
    expect(services.instanceId.length).toBeGreaterThan(0)

    expect(Array.isArray(services.bindings)).toBe(true)
    expect(services.bindings.length).toBeGreaterThan(0)

    const bindingSchema = runtimeServicesSchema?.properties?.bindings?.items
    const bindingRequired = new Set<string>(bindingSchema?.required ?? [])
    const bindingScopeEnum = bindingSchema?.properties?.scope?.enum

    for (const b of services.bindings as any[]) {
      for (const k of bindingRequired) {
        expect(k in b).toBe(true)
      }
      expect(typeof b.serviceId).toBe('string')
      expect(b.serviceId.length).toBeGreaterThan(0)
      expect(bindingScopeEnum).toContain(b.scope)
      expect(typeof b.overridden).toBe('boolean')
    }
  })
})
