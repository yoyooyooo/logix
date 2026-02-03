import { describe, it, expect } from '@effect/vitest'
import { Context, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Reflection.extractManifest digest includes servicePorts (078)', () => {
  it('should change digest when servicePorts change', () => {
    class FooService extends Context.Tag('svc/foo')<FooService, { readonly foo: string }>() {}
    class BarService extends Context.Tag('svc/bar')<BarService, { readonly bar: string }>() {}

    const make = (services: unknown) =>
      Logix.Module.make('Manifest.ServicePorts.Digest', {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { noop: Schema.Void } as const,
        services: services as any,
      }).implement({ initial: { n: 0 }, logics: [] })

    const a = Logix.Reflection.extractManifest(make({ a: FooService }))
    const b = Logix.Reflection.extractManifest(make({ a: FooService, b: BarService }))

    expect(a.moduleId).toBe('Manifest.ServicePorts.Digest')
    expect(b.moduleId).toBe('Manifest.ServicePorts.Digest')
    expect(a.digest).not.toBe(b.digest)
  })
})

