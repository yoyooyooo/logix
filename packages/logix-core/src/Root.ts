import type * as Internal from './internal/root.js'
import * as Impl from './internal/root.js'

export type RootResolveEntrypoint = Internal.RootResolveEntrypoint
export type RootResolveOptions = Internal.RootResolveOptions

export const resolve = Impl.resolve
export const layerFromContext = Impl.layerFromContext
