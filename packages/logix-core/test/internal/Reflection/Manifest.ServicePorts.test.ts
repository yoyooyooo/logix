import { describe, it, expect } from '@effect/vitest'
import { Context, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Reflection.extractManifest servicePorts (083)', () => {
  it('should export stably sorted servicePorts with optional flag', () => {
    class FooService extends Context.Tag('svc/foo')<FooService, { readonly foo: string }>() {}
    class BarService extends Context.Tag('svc/bar')<BarService, { readonly bar: string }>() {}

    const M = Logix.Module.make('Manifest.ServicePorts', {
      state: Schema.Struct({ n: Schema.Number }),
      actions: { noop: Schema.Void } as const,
      services: {
        z: BarService,
        a: { tag: FooService, optional: true },
      },
    })

    const impl = M.implement({ initial: { n: 0 }, logics: [] })

    const manifest = Logix.Reflection.extractManifest(impl)
    expect(manifest.manifestVersion).toBe('083')
    expect(manifest.servicePorts).toEqual([
      { port: 'a', serviceId: 'svc/foo', optional: true },
      { port: 'z', serviceId: 'svc/bar' },
    ])
  })
})
