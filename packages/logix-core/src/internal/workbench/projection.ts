import type {
  RuntimeWorkbenchAuthorityBundle,
  RuntimeWorkbenchDebugEventBatchInput,
  RuntimeWorkbenchEvidenceGapInput,
  RuntimeWorkbenchReflectionNodeInput,
  RuntimeWorkbenchRunResultInput,
  RuntimeWorkbenchTruthInput,
} from './authority.js'
import { authorityRefOf, sourceDigestOfInput } from './authority.js'
import {
  hasStableRuntimeCoordinate,
  runtimeCoordinateId,
  runtimeCoordinateOfDebugEvent,
  sourceDigestFromContext,
  sourceProjectionsFromContext,
} from './coordinates.js'
import {
  degradationFinding,
  findingFromGap,
  findingFromRunFailure,
  findingsFromControlPlaneReport,
} from './findings.js'
import { makeRuntimeWorkbenchGap } from './gaps.js'
import {
  artifactProjectionFromEvidenceArtifact,
  artifactProjectionFromReportArtifact,
  makeProjectionIndex,
  type RuntimeWorkbenchArtifactProjection,
  type RuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchSessionProjection,
} from './indexes.js'
import type { RuntimeWorkbenchFindingProjection } from './findings.js'
import type { RuntimeWorkbenchEvidenceGap } from './gaps.js'

export const deriveRuntimeWorkbenchProjectionIndex = (
  bundle: RuntimeWorkbenchAuthorityBundle,
): RuntimeWorkbenchProjectionIndex => {
  const contextDigest = sourceDigestFromContext(bundle.contextRefs)
  const sources = sourceProjectionsFromContext(bundle.contextRefs)
  const sessions: RuntimeWorkbenchSessionProjection[] = []
  const findings: RuntimeWorkbenchFindingProjection[] = []
  const artifacts: RuntimeWorkbenchArtifactProjection[] = []
  const gaps: RuntimeWorkbenchEvidenceGap[] = []

  for (const input of bundle.truthInputs) {
    const authorityRef = authorityRefOf(input)
    const sourceDigest = sourceDigestOfInput(input) ?? contextDigest
    const inputGaps: RuntimeWorkbenchEvidenceGap[] = []
    if (!sourceDigest) {
      inputGaps.push(makeRuntimeWorkbenchGap({ code: 'missing-source-digest', owner: 'session', authorityRef }))
    } else if (contextDigest && sourceDigestOfInput(input) && sourceDigestOfInput(input) !== contextDigest) {
      inputGaps.push(makeRuntimeWorkbenchGap({ code: 'digest-mismatch', owner: 'session', authorityRef }))
    }

    const result = projectTruthInput(input, sourceDigest)
    inputGaps.push(...result.gaps)
    gaps.push(...inputGaps)
    findings.push(...result.findings, ...inputGaps.map(findingFromGap))
    artifacts.push(...result.artifacts)

    sessions.push({
      id: sessionIdOf(input, authorityRef, result.runtimeCoordinate),
      authorityRef,
      inputKind: input.kind,
      status: result.status,
      ...(sourceDigest ? { sourceDigest } : null),
      ...(result.runtimeCoordinate ? { runtimeCoordinate: result.runtimeCoordinate } : null),
      findingRefs: [...result.findings.map((finding) => finding.id), ...inputGaps.map((gap) => `finding:${gap.id}`)],
      artifactRefs: result.artifacts.map((artifact) => artifact.id),
      drilldownRefs: result.drilldownRefs,
      gapRefs: inputGaps.map((gap) => gap.id),
    })
  }

  return makeProjectionIndex({ sessions, findings, artifacts, gaps, sources })
}

const projectTruthInput = (
  input: RuntimeWorkbenchTruthInput,
  sourceDigest: string | undefined,
): {
  readonly status: RuntimeWorkbenchSessionProjection['status']
  readonly findings: ReadonlyArray<RuntimeWorkbenchFindingProjection>
  readonly artifacts: ReadonlyArray<RuntimeWorkbenchArtifactProjection>
  readonly gaps: ReadonlyArray<RuntimeWorkbenchEvidenceGap>
  readonly drilldownRefs: ReadonlyArray<string>
  readonly runtimeCoordinate?: RuntimeWorkbenchSessionProjection['runtimeCoordinate']
} => {
  const authorityRef = authorityRefOf(input)
  switch (input.kind) {
    case 'run-result':
      return projectRunResult(input, authorityRef)
    case 'control-plane-report': {
      const artifacts = input.report.artifacts.map((artifact) => artifactProjectionFromReportArtifact(artifact, authorityRef))
      const gaps: RuntimeWorkbenchEvidenceGap[] = []
      if (input.report.repairHints.every((hint) => hint.focusRef === null) && !input.report.findings?.some((finding) => finding.focusRef)) {
        gaps.push(makeRuntimeWorkbenchGap({ code: 'missing-focus-ref', owner: 'finding', authorityRef }))
      }
      if (input.report.artifacts.length === 0) {
        gaps.push(makeRuntimeWorkbenchGap({ code: 'missing-artifact-output-key', owner: 'artifact', authorityRef }))
      }
      return {
        status: statusFromVerdict(input.report.verdict),
        findings: findingsFromControlPlaneReport(input.report, authorityRef),
        artifacts,
        gaps,
        drilldownRefs: input.report.artifacts.map((artifact) => `artifact:${artifact.outputKey}`),
      }
    }
    case 'evidence-package': {
      const artifacts = (input.artifacts ?? []).map((artifact) => artifactProjectionFromEvidenceArtifact(artifact, authorityRef))
      return {
        status: 'unknown',
        findings: [],
        artifacts,
        gaps:
          artifacts.length === 0
            ? [makeRuntimeWorkbenchGap({ code: 'missing-artifact-output-key', owner: 'artifact', authorityRef })]
            : [],
        drilldownRefs: artifacts.map((artifact) => artifact.id),
      }
    }
    case 'artifact-ref':
      return {
        status: 'unknown',
        findings: [],
        artifacts: [artifactProjectionFromReportArtifact(input.artifact, authorityRef)],
        gaps: [],
        drilldownRefs: [`artifact:${input.artifact.outputKey}`],
      }
    case 'reflection-node':
      return projectReflectionNode(input, authorityRef)
    case 'debug-event-batch':
      return projectDebugEventBatch(input, authorityRef, sourceDigest)
    case 'evidence-gap':
      return projectEvidenceGap(input, authorityRef)
  }
}

const projectRunResult = (
  input: RuntimeWorkbenchRunResultInput,
  authorityRef: ReturnType<typeof authorityRefOf>,
): ReturnType<typeof projectTruthInput> => {
  const finding = findingFromRunFailure(input, authorityRef)
  return {
    status: input.status === 'passed' ? 'passed' : 'failed',
    findings: finding ? [finding] : [],
    artifacts: [
      {
        id: `artifact:run-result:${input.runId}`,
        authorityRef,
        artifactOutputKey: `run-result:${input.runId}`,
        kind: 'run',
        sourceRefs: [],
        preview: {
          status: input.status,
          ...(input.value !== undefined ? { value: input.value } : null),
          ...(input.valueKind ? { valueKind: input.valueKind } : null),
          ...(input.lossy !== undefined ? { lossy: input.lossy } : null),
          ...(input.lossReasons ? { lossReasons: input.lossReasons } : null),
          ...(input.failure ? { failure: input.failure } : null),
          ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : null),
        },
      },
    ],
    gaps: [],
    drilldownRefs: [`artifact:run-result:${input.runId}`],
  }
}

const projectReflectionNode = (
  input: RuntimeWorkbenchReflectionNodeInput,
  authorityRef: ReturnType<typeof authorityRefOf>,
): ReturnType<typeof projectTruthInput> => {
  const artifactId = `artifact:reflection:${input.nodeId}`
  const findings = input.degraded
    ? [
        degradationFinding({
          id: input.nodeId,
          authorityRef,
          summary: input.degradationReason ?? `Reflection ${input.nodeKind} node is degraded`,
        }),
      ]
    : []
  return {
    status: input.degraded ? 'inconclusive' : 'passed',
    findings,
    artifacts: [
      {
        id: artifactId,
        authorityRef,
        artifactOutputKey: `reflection:${input.nodeId}`,
        kind: 'reflection',
        sourceRefs: input.sourceRef ? [input.sourceRef] : [],
        preview: {
          nodeKind: input.nodeKind,
          nodeId: input.nodeId,
          summary: input.summary,
          ...(input.manifestDigest ? { manifestDigest: input.manifestDigest } : null),
          ...(input.actionTag ? { actionTag: input.actionTag } : null),
          ...(input.payload ? { payload: input.payload } : null),
          ...(input.dependency ? { dependency: input.dependency } : null),
          ...(input.focusRef ? { focusRef: input.focusRef } : null),
          ...(input.sourceRef ? { sourceRef: input.sourceRef } : null),
          ...(input.degraded !== undefined ? { degraded: input.degraded } : null),
          ...(input.degradationReason ? { degradationReason: input.degradationReason } : null),
        },
      },
    ],
    gaps: [],
    drilldownRefs: [
      artifactId,
      ...(input.sourceRef ? [`source:${input.sourceRef}`] : []),
      ...(input.focusRef ? [`focus:${JSON.stringify(input.focusRef)}`] : []),
    ],
  }
}

const projectDebugEventBatch = (
  input: RuntimeWorkbenchDebugEventBatchInput,
  authorityRef: ReturnType<typeof authorityRefOf>,
  _sourceDigest: string | undefined,
): ReturnType<typeof projectTruthInput> => {
  const gaps: RuntimeWorkbenchEvidenceGap[] = []
  const findings: RuntimeWorkbenchFindingProjection[] = []
  let firstStableCoordinate: RuntimeWorkbenchSessionProjection['runtimeCoordinate'] | undefined
  for (const [index, event] of input.events.entries()) {
    const coordinate = runtimeCoordinateOfDebugEvent(event)
    if (!hasStableRuntimeCoordinate(coordinate)) {
      gaps.push(
        makeRuntimeWorkbenchGap({
          code: 'debug-event-without-stable-coordinate',
          owner: 'session',
          authorityRef,
          detail: event.eventId ?? `index-${index}`,
        }),
      )
    } else if (!firstStableCoordinate) {
      firstStableCoordinate = coordinate
    }
    if (event.degraded || event.dropped) {
      findings.push(
        degradationFinding({
          id: event.eventId ?? `index-${index}`,
          authorityRef,
          summary: event.dropped ? 'Debug evidence was dropped' : 'Debug evidence was degraded',
        }),
      )
    }
  }
  return {
    status: gaps.length > 0 ? 'inconclusive' : 'unknown',
    findings,
    artifacts: [],
    gaps,
    drilldownRefs: input.events.map((event, index) => `debug:${event.eventId ?? event.eventSeq ?? index}`),
    ...(firstStableCoordinate ? { runtimeCoordinate: firstStableCoordinate } : null),
  }
}

const projectEvidenceGap = (
  input: RuntimeWorkbenchEvidenceGapInput,
  authorityRef: ReturnType<typeof authorityRefOf>,
): ReturnType<typeof projectTruthInput> => ({
  status: 'inconclusive',
  findings: [],
  artifacts: [],
  gaps: [
    {
      id: `gap:${input.owner}|${input.code}|${input.gapId}`,
      code: input.code,
      owner: input.owner,
      authorityRef,
      summary: input.summary,
      severity: input.severity,
    },
  ],
  drilldownRefs: [],
})

const sessionIdOf = (
  input: RuntimeWorkbenchTruthInput,
  authorityRef: ReturnType<typeof authorityRefOf>,
  runtimeCoordinate: RuntimeWorkbenchSessionProjection['runtimeCoordinate'] | undefined,
): string => {
  if (runtimeCoordinate) return `session:${input.kind}:${runtimeCoordinateId(runtimeCoordinate)}`
  return `session:${input.kind}:${authorityRef.id}`
}

const statusFromVerdict = (verdict: string): RuntimeWorkbenchSessionProjection['status'] => {
  if (verdict === 'PASS') return 'passed'
  if (verdict === 'FAIL') return 'failed'
  return 'inconclusive'
}
