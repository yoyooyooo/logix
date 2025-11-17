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
    queries: ($) => ({
      search: $.source({
        resource: Spec,
        deps: ['params.q'],
        triggers: ['manual'],
        concurrency: 'switch',
        key: (q) => {
          q.toUpperCase()
          // @ts-expect-error q is inferred as string from deps
          q.toFixed()
          return { q }
        },
      }),
    }),
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
    queries: ($) => ({
      search: $.source({
        resource: Spec,
        // @ts-expect-error deps path must be within { params; ui }
        deps: ['params.nope'],
        key: (q) => ({ q }),
      }),
    }),
  })

	  Query.make('QueryTypes.ReservedName', {
	    params: ParamsSchema,
	    initialParams: { q: 'x' },
	    // @ts-expect-error reserved query name: "params"
	    queries: ($) => ({
	      params: $.source({
	        resource: Spec,
	        deps: ['params.q'],
	        key: (q) => ({ q }),
	      }),
	    }),
	  })
}
