// Type-level regression (compile-time assertions; no runtime logic).
export {}

import { describe, it } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Query from '../src/index.js'

type Extends<A, B> = A extends B ? true : false
type Assert<T extends true> = T

// Note: this file is for type-level regression; it must not execute any Query.make / Resource.make logic at vitest runtime.
// Put all value-level constructions behind an unreachable branch to keep compile-time checks while avoiding runtime errors.
describe('Query types (compile-time)', () => {
  it('should typecheck', () => {})
})

if (false) {
  const KeySchema = Schema.Struct({ q: Schema.String })
  type Key = Schema.Schema.Type<typeof KeySchema>

  const Spec = Logix.Resource.make<Key, { readonly ok: true }, never, never>({
    id: 'demo/query-types',
    keySchema: KeySchema,
    load: (_key) => Effect.succeed({ ok: true as const }),
  })

  const ParamsSchema = Schema.Struct({ q: Schema.String })

  const Module = Query.make('QueryTypes', {
    params: ParamsSchema,
    initialParams: { q: 'x' },
    queries: {
      search: {
        resource: Spec,
        deps: ['params.q'],
        triggers: ['manual'],
        concurrency: 'switch',
        key: ({ params }: { readonly params: { readonly q: string } }) => ({ q: params.q }),
      },
    },
  })

  type Sh = typeof Module.shape
  type Action = Logix.ActionOf<Sh>
  type State = Logix.StateOf<Sh>

  type RefreshPayload = Extract<Action, { readonly _tag: 'refresh' }>['payload']
  type _AssertRefreshPayload = Assert<Extends<RefreshPayload, 'search' | undefined>>

  type SearchSnapshot = State['queries']['search']
  type _AssertSearchSnapshotData = Assert<Extends<SearchSnapshot['data'], { readonly ok: true } | undefined>>

  // @ts-expect-error refresh target must be keyof queries
  const _BadRefreshAction: Action = { _tag: 'refresh', payload: 'typo' }

  Query.make('QueryTypes.BadDeps', {
    params: ParamsSchema,
    initialParams: { q: 'x' },
    queries: {
      search: {
        resource: Spec,
        // @ts-expect-error deps path must be within { params; ui }
        deps: ['params.nope'],
        key: ({ params }: { readonly params: { readonly q: string } }) => ({ q: params.q }),
      },
    },
  })

  Query.make('QueryTypes.ReservedName', {
    params: ParamsSchema,
    initialParams: { q: 'x' },
    queries: {
      // @ts-expect-error reserved query name: "params"
      params: {
        resource: Spec,
        deps: ['params.q'],
        key: ({ params }: { readonly params: { readonly q: string } }) => ({ q: params.q }),
      },
    },
  })
}
