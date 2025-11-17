import { describe, it, expect } from '@effect/vitest'
import { readFileSync } from 'node:fs'
import { Effect } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as RuntimeKernel from '../../../../src/internal/runtime/core/RuntimeKernel.js'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

describe('RuntimeKernel.ServicesEvidence (contracts 020)', () => {
  it.scoped('exports JSON-serializable RuntimeServicesEvidence matching schema', () =>
    Effect.gen(function* () {
      const schema = readJson(
        new URL(
          '../../../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json',
          import.meta.url,
        ),
      )

      const makeRuntime = (instanceId: string) =>
        Effect.provideService(
          Effect.provideService(
            ModuleRuntime.make({ n: 0 }, { moduleId: 'M', instanceId }),
            RuntimeKernel.RuntimeServicesRuntimeConfigTag,
            {
              services: { txnQueue: { implId: 'trace' } },
            },
          ),
          RuntimeKernel.RuntimeServicesProviderOverridesTag,
          {
            services: { txnQueue: { implId: 'builtin' } },
          },
        )

      const runtimeProvider = yield* makeRuntime('i-provider')
      const providerEvidence = RuntimeKernel.getRuntimeServicesEvidence(runtimeProvider as any)

      expect(() => JSON.stringify(providerEvidence)).not.toThrow()
      expect(providerEvidence.scope).toBe('provider')

      const runtimeInstance = yield* Effect.provideService(
        makeRuntime('i-instance'),
        RuntimeKernel.RuntimeServicesInstanceOverridesTag,
        { txnQueue: { implId: 'trace' } },
      )

      const instanceEvidence = RuntimeKernel.getRuntimeServicesEvidence(runtimeInstance as any)

      expect(() => JSON.stringify(instanceEvidence)).not.toThrow()
      expect(instanceEvidence.scope).toBe('instance')

      const scopeEnum = schema?.properties?.scope?.enum
      expect(scopeEnum).toContain(instanceEvidence.scope)

      const required = new Set<string>(schema.required ?? [])
      for (const k of required) {
        expect(k in instanceEvidence).toBe(true)
      }

      expect(typeof instanceEvidence.instanceId).toBe('string')
      expect(instanceEvidence.instanceId.length).toBeGreaterThan(0)
      expect(Array.isArray(instanceEvidence.bindings)).toBe(true)
      expect(instanceEvidence.bindings.length).toBeGreaterThan(0)

      const bindingSchema = schema?.properties?.bindings?.items
      const bindingRequired = new Set<string>(bindingSchema?.required ?? [])
      const bindingScopeEnum = bindingSchema?.properties?.scope?.enum

      for (const b of instanceEvidence.bindings as any[]) {
        for (const k of bindingRequired) {
          expect(k in b).toBe(true)
        }
        expect(typeof b.serviceId).toBe('string')
        expect(b.serviceId.length).toBeGreaterThan(0)
        expect(bindingScopeEnum).toContain(b.scope)
        expect(typeof b.overridden).toBe('boolean')
      }
    }),
  )
})
