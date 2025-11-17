// Resource module: public facade (@logix/core/Resource).
// Note: implementation lives in `src/internal/resource.ts` to avoid internal importing root submodules.

import type * as Internal from './internal/resource.js'
import * as Impl from './internal/resource.js'

export type ResourceSpec<Key, Out, Err, Env> = Internal.ResourceSpec<Key, Out, Err, Env>
export type AnyResourceSpec = Internal.AnyResourceSpec
export type ResourceStatus = Internal.ResourceStatus
export type ResourceSnapshot<Data = unknown, Err = unknown> = Internal.ResourceSnapshot<Data, Err>
export type ResourceRegistry = Internal.ResourceRegistry
export type Spec<Key, Out, Err, Env> = Internal.Spec<Key, Out, Err, Env>

export const keyHash = Impl.keyHash
export const Snapshot = Impl.Snapshot
export const internal = Impl.internal
export const make = Impl.make
export const layer = Impl.layer

export { ResourceRegistryTag } from './internal/resource.js'
