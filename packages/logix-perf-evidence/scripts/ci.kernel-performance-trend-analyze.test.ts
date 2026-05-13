import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  buildKernelPerformanceTrendReport,
  runKernelPerformanceTrendAnalyzeCli,
} from './ci.kernel-performance-trend-analyze.js'
import type { KernelPerformanceKnobSnapshotReport } from './ci.kernel-performance-knob-snapshot.js'

const snapshot = (
  overrides: Partial<KernelPerformanceKnobSnapshotReport> = {},
): KernelPerformanceKnobSnapshotReport => ({
  schemaVersion: 1,
  kind: 'KernelPerformanceKnobSnapshotReport',
  generatedAt: '2026-05-13T00:00:00.000Z',
  profile: 'default',
  envId: 'linux.x64.chromium.headless',
  commitSha: 'a'.repeat(40),
  branch: 'feat/perf',
  matrixId: 'logix-browser-perf-matrix-v1',
  matrixHash: 'sha256:matrix',
  sourceReport: 'raw/snapshot.json',
  summary: {
    suites: 1,
    cells: 1,
    pass: 1,
    fail: 0,
    timeout: 0,
    missing: 0,
    skipped: 0,
    markers: 0,
    countersPresent: 1,
    countersMissing: 0,
  },
  suiteStatus: [{ id: 'runtimeStore.noTearing.tickNotify', status: 'pass', pointCount: 1 }],
  requiredSuites: [{ id: 'runtimeStore.noTearing.tickNotify', status: 'pass' }] as any,
  counterCensus: [
    {
      counter: 'runtimeStore.runSyncFallbackAfterBoot',
      stage: 'P1',
      status: 'present',
      value: 0,
      sourceSuite: 'runtimeStore.noTearing.tickNotify',
      sourceName: 'selectorNotify.runSyncFallbackCount',
    },
  ],
  knobCells: [],
  metrics: [
    {
      suiteId: 'runtimeStore.noTearing.tickNotify',
      metric: 'timePerTickMs',
      ok: 1,
      unavailable: 0,
      maxP95Ms: 3,
    },
  ],
  markers: [],
  missingEvidence: [],
  blocked: [],
  allowedClaims: [],
  forbiddenClaims: [],
  ...overrides,
})

describe('kernel performance trend analyze', () => {
  it('compares same-branch comparable snapshots and reports counter/suite/metric movement', () => {
    const report = buildKernelPerformanceTrendReport({
      branch: 'feat/perf',
      profile: 'default',
      snapshots: [
        snapshot(),
        snapshot({
          generatedAt: '2026-05-13T01:00:00.000Z',
          commitSha: 'b'.repeat(40),
          requiredSuites: [{ id: 'runtimeStore.noTearing.tickNotify', status: 'timeout' }] as any,
          counterCensus: [
            {
              counter: 'runtimeStore.runSyncFallbackAfterBoot',
              stage: 'P1',
              status: 'present',
              value: 1,
            },
          ],
          metrics: [
            {
              suiteId: 'runtimeStore.noTearing.tickNotify',
              metric: 'timePerTickMs',
              ok: 1,
              unavailable: 0,
              maxP95Ms: 6,
            },
          ],
          summary: { ...snapshot().summary, markers: 1 },
          missingEvidence: ['counter missing: dirtyPlan.unknownWrite'],
        }),
      ],
    })

    expect(report.status).toBe('movement')
    expect(report.counterMovements).toContainEqual(
      expect.objectContaining({ counter: 'runtimeStore.runSyncFallbackAfterBoot', movement: 'zero_to_positive' }),
    )
    expect(report.suiteMovements).toContainEqual(
      expect.objectContaining({ suite: 'runtimeStore.noTearing.tickNotify', fromStatus: 'pass', toStatus: 'timeout' }),
    )
    expect(report.metricMovements[0]).toEqual(expect.objectContaining({ deltaP95Ms: 3, ratioP95: 2 }))
    expect(report.markerMovements).toEqual({ from: 0, to: 1 })
    expect(report.missingEvidenceMovements).toEqual({ from: 0, to: 1 })
    expect(report.claimBoundary).toEqual(
      expect.objectContaining({
        artifactRole: 'trend',
        claimStrength: 'trend-candidate',
        allowedClaimKinds: ['trend-prioritization'],
      }),
    )
    expect(report.ownerMovements).toContainEqual(
      expect.objectContaining({
        ownerPath: 'RuntimeStore/React host',
        classification: 'migrated_risk',
      }),
    )
    expect(report.knobMovements).toContainEqual(
      expect.objectContaining({
        knob: 'storeTopicCount',
        ownerPath: 'RuntimeStore/React host',
        classification: 'migrated_risk',
      }),
    )
  })

  it('does not compare snapshots with env/profile/matrix drift', () => {
    const report = buildKernelPerformanceTrendReport({
      branch: 'feat/perf',
      profile: 'default',
      snapshots: [snapshot(), snapshot({ envId: 'different', commitSha: 'c'.repeat(40) })],
    })

    expect(report.status).toBe('insufficient')
    expect(report.blockers).toContain('fewer than two comparable snapshot artifacts for latest env/profile/matrixHash')
    expect(report.forbiddenClaims.join('\n')).toContain('replace explicit before/after convergence')
  })

  it('writes branch-safe artifact filenames for slash branches', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-perf-trend-'))
    const inputDir = path.join(root, 'input')
    const outDir = path.join(root, 'out')
    await fs.mkdir(path.join(inputDir, 'one', 'reports'), { recursive: true })
    await fs.mkdir(path.join(inputDir, 'two', 'reports'), { recursive: true })
    await fs.writeFile(path.join(inputDir, 'one', 'reports', 'snapshot.default.json'), `${JSON.stringify(snapshot())}\n`, 'utf8')
    await fs.writeFile(
      path.join(inputDir, 'two', 'reports', 'snapshot.default.json'),
      `${JSON.stringify(snapshot({ generatedAt: '2026-05-13T01:00:00.000Z', commitSha: 'b'.repeat(40) }))}\n`,
      'utf8',
    )

    await runKernelPerformanceTrendAnalyzeCli([
      '--input-dir',
      inputDir,
      '--out-dir',
      outDir,
      '--branch',
      'feat/perf-loop',
      '--profile',
      'default',
    ])

    await expect(fs.stat(path.join(outDir, 'reports', 'trend.feat-perf-loop.default.json'))).resolves.toBeTruthy()
  })
})
