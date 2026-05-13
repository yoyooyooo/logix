import * as ReadQueryInternal from './internal/read-query.js'

export type ReadLane = ReadQueryInternal.ReadLane
export type ReadProducer = ReadQueryInternal.ReadProducer
export type EqualsKind = ReadQueryInternal.EqualsKind
export type ReadsDigest = ReadQueryInternal.ReadsDigest
export type ReadQueryStrictGateRule = ReadQueryInternal.ReadQueryStrictGateRule
export type ReadQueryFallbackReason = ReadQueryInternal.ReadQueryFallbackReason
export type ReadQueryQualityMeta = ReadQueryInternal.ReadQueryQualityMeta
export type ReadQueryStrictGateGrade = ReadQueryInternal.ReadQueryStrictGateGrade

export type ReadQueryStaticIr = ReadQueryInternal.ReadQueryStaticIr

export type ReadQuery<S, V> = ReadQueryInternal.ReadQuery<S, V>
export type ReadQueryCompiled<S, V> = ReadQueryInternal.ReadQueryCompiled<S, V>
export type ReadQueryInput<S, V> = ReadQueryInternal.ReadQueryInput<S, V>
export type ReadQueryStrictGateConfig = ReadQueryInternal.ReadQueryStrictGateConfig
export type ReadQueryStrictGateDecision = ReadQueryInternal.ReadQueryStrictGateDecision

export const isReadQuery = ReadQueryInternal.isReadQuery
export const isReadQueryCompiled = ReadQueryInternal.isReadQueryCompiled
export const hasBuildQualityGrade = ReadQueryInternal.hasBuildQualityGrade
export const shouldEvaluateStrictGateAtRuntime = ReadQueryInternal.shouldEvaluateStrictGateAtRuntime
export const markRuntimeMissingBuildGrade = ReadQueryInternal.markRuntimeMissingBuildGrade
export const resolveBuildGradeStrictGateDecision = ReadQueryInternal.resolveBuildGradeStrictGateDecision

export const make = ReadQueryInternal.make

export const compile = ReadQueryInternal.compile
export const evaluateStrictGate = ReadQueryInternal.evaluateStrictGate

export type SelectorQualityEntry = ReadQueryInternal.SelectorQualityEntry
export type SelectorQualitySummary = ReadQueryInternal.SelectorQualitySummary
export type SelectorQualityReport = ReadQueryInternal.SelectorQualityReport
export type SelectorQualityReportResult = ReadQueryInternal.SelectorQualityReportResult
export type BuildReadQueryGradeResult<S, V> = ReadQueryInternal.BuildReadQueryGradeResult<S, V>

export const gradeReadQueryAtBuild = ReadQueryInternal.gradeReadQueryAtBuild
export const buildSelectorQualityReport = ReadQueryInternal.buildSelectorQualityReport
export const hasBuildGateFailure = ReadQueryInternal.hasBuildGateFailure
