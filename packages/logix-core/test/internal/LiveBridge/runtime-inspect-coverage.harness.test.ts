import { describe, expect, it } from '@effect/vitest'

import { fnv1a32, stableStringify } from '../../../src/internal/digest.js'

const makeRuntimeInspectCoverageInventory = () => ({
  schemaVersion: 'runtime-inspect-coverage.v1',
  factFamilies: [
    {
      factFamily: 'target',
      owner: '171-live-attachment',
      matrixRows: ['R172-001', 'R172-002'],
      cliRoutes: ['logix live targets --tree', 'logix live inspect <target>'],
      artifactSections: ['target-detail'],
      status: 'owner-backed',
      proofRefs: ['packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts', 'LiveInspectArtifact(target-detail)'],
    },
    {
      factFamily: 'state',
      owner: 'runtime-live',
      matrixRows: ['R172-003'],
      cliRoutes: ['logix live state --target ...'],
      artifactSections: ['state'],
      status: 'owner-backed',
      proofRefs: [
        'packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
      ],
    },
    {
      factFamily: 'state-path',
      owner: 'runtime-live',
      matrixRows: ['R172-004'],
      cliRoutes: ['logix live state --target ... --path ...'],
      artifactSections: ['state-path'],
      status: 'owner-backed',
      proofRefs: [
        'packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
      ],
    },
    {
      factFamily: 'action-manifest',
      owner: 'reflection',
      matrixRows: ['R172-005', 'R172-006'],
      cliRoutes: ['logix live actions --target ...'],
      artifactSections: ['actions'],
      status: 'owner-backed',
      proofRefs: [
        'LiveManifestBindingRef',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
      ],
    },
    {
      factFamily: 'dispatch-validation',
      owner: 'reflection',
      matrixRows: ['R172-007', 'R172-008'],
      cliRoutes: ['logix live dispatch --target ... --action ...'],
      artifactSections: ['LiveOperationFacet'],
      status: 'owner-backed',
      proofRefs: ['LiveManifestBindingRef', 'packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts'],
    },
    {
      factFamily: 'snapshot',
      owner: 'runtime-live',
      matrixRows: ['R172-009'],
      cliRoutes: ['logix live snapshot --target ...'],
      artifactSections: ['snapshot'],
      status: 'owner-backed',
      proofRefs: ['LiveInspectArtifact(snapshot)', 'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts'],
    },
    {
      factFamily: 'event-window',
      owner: 'runtime-live',
      matrixRows: ['R172-010'],
      cliRoutes: ['logix live events --target ... --kind ...'],
      artifactSections: ['events'],
      status: 'owner-backed',
      proofRefs: [
        'LiveOperationWindow',
        'packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'timeline',
      owner: 'runtime-live',
      matrixRows: ['R172-011', 'R172-012'],
      cliRoutes: ['logix live timeline --target ...'],
      artifactSections: ['timeline'],
      status: 'owner-backed',
      proofRefs: [
        'true-post-event-state-or-gap',
        'packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'operation-summary',
      owner: 'runtime-live',
      matrixRows: ['R172-013', 'R172-014'],
      cliRoutes: ['logix live summary --target ...'],
      artifactSections: ['summary'],
      status: 'owner-backed',
      proofRefs: [
        'LiveSummaryOperationSlice',
        'packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'field-converge',
      owner: 'field-runtime',
      matrixRows: ['R172-015'],
      cliRoutes: ['logix live summary --target ...'],
      artifactSections: ['summary'],
      status: 'owner-backed',
      proofRefs: [
        'LiveSummaryFieldConvergenceSlice',
        'packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'field-list',
      owner: 'field-runtime',
      matrixRows: ['R172-016'],
      cliRoutes: ['logix live fields --target ...'],
      artifactSections: ['fields'],
      status: 'owner-backed',
      proofRefs: [
        'FinalFieldProjection',
        'packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
      ],
    },
    {
      factFamily: 'field-graph',
      owner: 'field-runtime',
      matrixRows: ['R172-017'],
      cliRoutes: ['logix live field-graph --target ...'],
      artifactSections: ['field-graph'],
      status: 'owner-backed',
      proofRefs: [
        'fieldPath-keyed-semantic-adjacency',
        'packages/logix-core/test/internal/LiveBridge/live-field-graph.guard.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
      ],
    },
    {
      factFamily: 'field-summary',
      owner: 'field-runtime',
      matrixRows: ['R172-018'],
      cliRoutes: ['logix live field-summary --target ...'],
      artifactSections: ['field-summary'],
      status: 'owner-backed',
      proofRefs: [
        'FieldSummaryProjection',
        'packages/logix-core/test/internal/LiveBridge/live-field-summary.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'diagnostics',
      owner: 'runtime-live',
      matrixRows: ['R172-019'],
      cliRoutes: ['logix live events --target ... --kind diagnostic'],
      artifactSections: ['events'],
      status: 'owner-backed',
      proofRefs: [
        'LiveDebugSourceRecord',
        'packages/logix-core/test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'process-events',
      owner: 'runtime-live',
      matrixRows: ['R172-020'],
      cliRoutes: ['logix live events --target ... --kind process'],
      artifactSections: ['events'],
      status: 'owner-backed',
      proofRefs: [
        'RuntimeDebugEventRef',
        'packages/logix-core/test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts',
        'packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts',
        'packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts',
      ],
    },
    {
      factFamily: 'static-summary',
      owner: 'reflection',
      matrixRows: ['R172-021'],
      cliRoutes: ['logix live inspect <target>'],
      artifactSections: ['target-detail'],
      status: 'owner-backed',
      proofRefs: ['LiveManifestBindingRef'],
    },
    {
      factFamily: 'evidence-export',
      owner: 'evidence',
      matrixRows: ['R172-022'],
      cliRoutes: ['logix live export evidence --from <daemon-lineage-ref>'],
      artifactSections: ['CanonicalEvidencePackageRef'],
      status: 'owner-backed',
      proofRefs: [
        'packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts',
        'packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts',
      ],
    },
    {
      factFamily: 'react-host',
      owner: 'future-react-host',
      matrixRows: ['R172-023'],
      cliRoutes: ['logix live summary/events ... structured gap'],
      artifactSections: ['react-host'],
      status: 'deferred',
      proofRefs: ['P2 future React host owner'],
    },
    {
      factFamily: 'profile-summary',
      owner: 'future-profile-owner',
      matrixRows: ['R172-024'],
      cliRoutes: ['logix live profile summary'],
      artifactSections: ['LiveProfileSummary'],
      status: 'deferred',
      proofRefs: ['P2 future profile owner'],
    },
    {
      factFamily: 'browser-deep-profile',
      owner: 'future-profile-owner',
      matrixRows: ['R172-025'],
      cliRoutes: [],
      artifactSections: [],
      status: 'rejected',
      proofRefs: ['future browser profiler spec required'],
    },
    {
      factFamily: 'mutation-debug',
      owner: 'runtime-live',
      matrixRows: ['R172-026'],
      cliRoutes: [],
      artifactSections: [],
      status: 'rejected',
      proofRefs: ['rejected by live safety law'],
    },
  ],
} as const)

const runtimeInspectCoverageDigest = (inventory: ReturnType<typeof makeRuntimeInspectCoverageInventory>): string =>
  `runtime-inspect-coverage:${fnv1a32(stableStringify(inventory))}`

const requiredMatrixRows = Array.from({ length: 26 }, (_, index) => `R172-${String(index + 1).padStart(3, '0')}`)

const gapReasonFromProofRef = (proofRef: string): string | undefined => {
  const match = proofRef.match(/^(?<reason>[a-z][a-z0-9-]+) structured gap$/)
  return match?.groups?.reason
}

const missingStructuredGapProofRefs = (inventory: ReturnType<typeof makeRuntimeInspectCoverageInventory>) =>
  inventory.factFamilies
    .filter((entry) => entry.status === 'structured-gap')
    .flatMap((entry) =>
      entry.proofRefs.some((proofRef) => gapReasonFromProofRef(proofRef))
        ? []
        : [`${entry.factFamily}:${entry.proofRefs.join(',')}`],
    )

const summarizeRuntimeInspectCoverage = (inventory: ReturnType<typeof makeRuntimeInspectCoverageInventory>) => {
  const coveredRows = new Set(inventory.factFamilies.flatMap((entry) => entry.matrixRows))
  const structuredGapReasons = inventory.factFamilies
    .filter((entry) => entry.status === 'structured-gap')
    .flatMap((entry) => entry.proofRefs.flatMap((proofRef) => {
      const reason = gapReasonFromProofRef(proofRef)
      return reason ? [reason] : []
    }))

  return {
    digest: runtimeInspectCoverageDigest(inventory),
    totalFactFamilies: inventory.factFamilies.length,
    unmappedMatrixRows: requiredMatrixRows.filter((row) => !coveredRows.has(row)),
    ownerBackedCount: inventory.factFamilies.filter((entry) => entry.status === 'owner-backed').length,
    structuredGapCount: inventory.factFamilies.filter((entry) => entry.status === 'structured-gap').length,
    structuredGapReasons,
    deferredCount: inventory.factFamilies.filter((entry) => entry.status === 'deferred').length,
    rejectedCount: inventory.factFamilies.filter((entry) => entry.status === 'rejected').length,
  }
}

describe('runtime inspect coverage harness', () => {
  it('maps every current runtime inspect fact family to a route, artifact section and proof ref', () => {
    const inventory = makeRuntimeInspectCoverageInventory()
    const summary = summarizeRuntimeInspectCoverage(inventory)

    expect(inventory.schemaVersion).toBe('runtime-inspect-coverage.v1')
    expect(summary.totalFactFamilies).toBe(21)
    expect(summary.unmappedMatrixRows).toEqual([])
    expect(inventory.factFamilies.every((entry) => entry.matrixRows.length > 0)).toBe(true)
    expect(inventory.factFamilies.filter((entry) => entry.status !== 'rejected').every((entry) => entry.cliRoutes.length > 0)).toBe(true)
    expect(inventory.factFamilies.filter((entry) => entry.status !== 'rejected').every((entry) => entry.artifactSections.length > 0)).toBe(true)
    expect(inventory.factFamilies.every((entry) => entry.proofRefs.length > 0)).toBe(true)
    expect(summary.ownerBackedCount).toBe(17)
    expect(summary.structuredGapCount).toBe(0)
    expect(summary.deferredCount).toBe(2)
    expect(summary.rejectedCount).toBe(2)
    expect(summary.structuredGapReasons).toEqual([])
    expect(missingStructuredGapProofRefs(inventory)).toEqual([])
    expect(inventory.factFamilies.some((entry) => entry.owner === 'cli')).toBe(false)
    expect(inventory.factFamilies.some((entry) => entry.owner === 'daemon')).toBe(false)
    expect(inventory.factFamilies.some((entry) => entry.owner === 'browser-adapter')).toBe(false)
  })

  it('records stable proof obligations for binding, timeline and field graph laws', () => {
    const inventory = makeRuntimeInspectCoverageInventory()
    const serialized = JSON.stringify(inventory)

    expect(serialized).toContain('LiveManifestBindingRef')
    expect(serialized).toContain('true-post-event-state-or-gap')
    expect(serialized).toContain('fieldPath-keyed-semantic-adjacency')
    expect(summarizeRuntimeInspectCoverage(inventory).digest).toMatch(/^runtime-inspect-coverage:/)
  })
})
