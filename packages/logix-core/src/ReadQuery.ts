import * as ReadQueryCore from './internal/runtime/core/ReadQuery.js'

export type ReadLane = ReadQueryCore.ReadLane
export type ReadProducer = ReadQueryCore.ReadProducer
export type EqualsKind = ReadQueryCore.EqualsKind
export type ReadsDigest = ReadQueryCore.ReadsDigest

export type ReadQueryStaticIr = ReadQueryCore.ReadQueryStaticIr

export type ReadQuery<S, V> = ReadQueryCore.ReadQuery<S, V>
export type ReadQueryCompiled<S, V> = ReadQueryCore.ReadQueryCompiled<S, V>
export type ReadQueryInput<S, V> = ReadQueryCore.ReadQueryInput<S, V>

export const isReadQuery = ReadQueryCore.isReadQuery

export const make = ReadQueryCore.make

export const compile = ReadQueryCore.compile
