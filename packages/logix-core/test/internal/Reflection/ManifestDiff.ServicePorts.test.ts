import { describe, it, expect } from '@effect/vitest'
import { Context, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Reflection.diffManifest servicePorts (078)', () => {
  it('should report added/removed/serviceIdChanged/optionalChanged', () => {
    class ServiceA extends Context.Tag('svc/a')<ServiceA, { readonly a: string }>() {}
    class ServiceB extends Context.Tag('svc/b')<ServiceB, { readonly b: string }>() {}

    const makeManifest = (services: unknown) =>
      Logix.Reflection.extractManifest(
        Logix.Module.make('ManifestDiff.ServicePorts', {
          state: Schema.Struct({ n: Schema.Number }),
          actions: { noop: Schema.Void } as const,
          services: services as any,
        }).implement({ initial: { n: 0 }, logics: [] }),
      )

    const before = makeManifest({ api: ServiceA, opt: { tag: ServiceB, optional: true }, removed: ServiceA })
    const after = makeManifest({ api: ServiceB, extra: ServiceA, opt: ServiceB })

    const diff = Logix.Reflection.diffManifest(before, after)

    const codes = diff.changes.map((c) => c.code)
    expect(codes).toContain('servicePorts.added')
    expect(codes).toContain('servicePorts.removed')
    expect(codes).toContain('servicePorts.serviceIdChanged')
    expect(codes).toContain('servicePorts.optionalChanged')
    expect(diff.summary.breaking).toBeGreaterThan(0)
  })
})
