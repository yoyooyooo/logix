import * as ReadQueryCore from './internal/runtime/core/ReadQuery.js'
import * as ReadQueryBuildGateCore from './internal/runtime/core/ReadQueryBuildGate.js'

export type ReadLane = ReadQueryCore.ReadLane
export type ReadProducer = ReadQueryCore.ReadProducer
export type EqualsKind = ReadQueryCore.EqualsKind
export type ReadsDigest = ReadQueryCore.ReadsDigest
export type ReadQueryStrictGateRule = ReadQueryCore.ReadQueryStrictGateRule
export type ReadQueryFallbackReason = ReadQueryCore.ReadQueryFallbackReason
export type ReadQueryQualityMeta = ReadQueryCore.ReadQueryQualityMeta
export type ReadQueryStrictGateGrade = ReadQueryCore.ReadQueryStrictGateGrade

export type ReadQueryStaticIr = ReadQueryCore.ReadQueryStaticIr

export type ReadQuery<S, V> = ReadQueryCore.ReadQuery<S, V>
export type ReadQueryCompiled<S, V> = ReadQueryCore.ReadQueryCompiled<S, V>
export type ReadQueryInput<S, V> = ReadQueryCore.ReadQueryInput<S, V>
export type ReadQueryStrictGateConfig = ReadQueryCore.ReadQueryStrictGateConfig
export type ReadQueryStrictGateDecision = ReadQueryCore.ReadQueryStrictGateDecision

export const isReadQuery = ReadQueryCore.isReadQuery
export const isReadQueryCompiled = ReadQueryCore.isReadQueryCompiled
export const hasBuildQualityGrade = ReadQueryCore.hasBuildQualityGrade
export const shouldEvaluateStrictGateAtRuntime = ReadQueryCore.shouldEvaluateStrictGateAtRuntime

export const make = ReadQueryCore.make

export const compile = ReadQueryCore.compile
export const evaluateStrictGate = ReadQueryCore.evaluateStrictGate

export type SelectorQualityEntry = ReadQueryBuildGateCore.SelectorQualityEntry
export type SelectorQualitySummary = ReadQueryBuildGateCore.SelectorQualitySummary
export type SelectorQualityReport = ReadQueryBuildGateCore.SelectorQualityReport
export type SelectorQualityReportResult = ReadQueryBuildGateCore.SelectorQualityReportResult
export type BuildReadQueryGradeResult<S, V> = ReadQueryBuildGateCore.BuildReadQueryGradeResult<S, V>

export const gradeReadQueryAtBuild = ReadQueryBuildGateCore.gradeReadQueryAtBuild
export const buildSelectorQualityReport = ReadQueryBuildGateCore.buildSelectorQualityReport
export const hasBuildGateFailure = ReadQueryBuildGateCore.hasBuildGateFailure
