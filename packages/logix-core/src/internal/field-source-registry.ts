import { ServiceMap } from 'effect'
import type { Effect } from 'effect'

export interface FieldSourceSpec {
  readonly load: (key: unknown) => Effect.Effect<any, any, any>
}

export interface FieldSourceRegistry {
  readonly specs: ReadonlyMap<string, FieldSourceSpec>
}

export class FieldSourceRegistryTag extends ServiceMap.Service<
  FieldSourceRegistryTag,
  FieldSourceRegistry
>()('@logixjs/core/FieldSourceRegistry') {}
