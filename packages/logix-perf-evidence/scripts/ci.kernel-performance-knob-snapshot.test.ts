import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  buildKernelPerformanceKnobSnapshot,
  runKernelPerformanceKnobSnapshotCli,
} from './ci.kernel-performance-knob-snapshot.js'

const baseReport = {
  schemaVersion: 1,
  meta: {
    matrixId: 'logix-browser-perf-matrix-v1',
    matrixHash: 'sha256:matrix',
    git: { branch: 'feat/perf', commit: 'abcdef1234567890', dirty: false },
    config: { profile: 'default' },
    env: {
      os: 'linux',
      arch: 'x64',
      node: 'v22.0.0',
      browser: { name: 'chromium', version: '143.0.0', headless: true },
    },
  },
  suites: [
    {
      id: 'runtimeStore.noTearing.tickNotify',
      points: [
        {
          params: { diagnosticsLevel: 'off', watchers: 128 },
          status: 'ok',
          metrics: [{ name: 'timePerTickMs', status: 'ok', stats: { medianMs: 2, p95Ms: 3 } }],
          evidence: [
            { name: 'selectorNotify.runSyncFallbackCount', status: 'ok', value: 0 },
            { name: 'selectorNotify.retainedTopicCount', status: 'ok', value: 128 },
          ],
        },
      ],
    },
    {
      id: 'txnQueue.directIdle',
      points: [
        {
          params: { mode: 'on' },
          status: 'ok',
          metrics: [{ name: 'runtime.backlogCatchUpMs', status: 'ok', stats: { medianMs: 1, p95Ms: 2 } }],
          evidence: [
            { name: 'txnQueue.urgent.startMode.directIdle', status: 'ok', value: 1 },
            { name: 'txnQueue.urgent.queueWaitMs', status: 'ok', value: 0 },
          ],
        },
      ],
    },
  ],
} as const

describe('kernel performance knob snapshot', () => {
  it('materializes current-commit knob cells, suite status, and counter census without improvement claims', () => {
    const report = buildKernelPerformanceKnobSnapshot({
      report: baseReport,
      reportPath: 'perf/snapshot/raw/snapshot.json',
      examplesReport: {
        profile: 'default',
        suites: [
          { id: 'examples.runtimeWitness', status: 'pass' },
          { id: 'examples.playgroundNoiseIsolation', status: 'pass' },
        ],
        counters: {
          'examples.kernelPlaygroundCostMixed': 0,
          'examples.publicResidueViolation': 0,
        },
      },
    })

    expect(report.kind).toBe('KernelPerformanceKnobSnapshotReport')
    expect(report.summary.cells).toBe(2)
    expect(report.summary.pass).toBe(2)
    expect(report.knobCells[0]?.knobs).toEqual({ diagnosticsLevel: 'off', watchers: 128 })
    expect(report.counterCensus.find((entry) => entry.counter === 'runtimeStore.runSyncFallbackAfterBoot')?.value).toBe(0)
    expect(report.counterCensus.find((entry) => entry.counter === 'examples.kernelPlaygroundCostMixed')?.status).toBe('present')
    expect(report.counterCensus.find((entry) => entry.counter === 'dirtyPlan.unknownWrite')?.status).toBe('missing')
    expect(report.claimBoundary).toEqual(
      expect.objectContaining({
        artifactRole: 'snapshot',
        claimStrength: 'current-state',
        allowedClaimKinds: ['current-state'],
      }),
    )
    expect(report.claimBoundary.forbiddenClaimKinds).toContain('improvement')
    expect(report.knobCells[0]?.mapping).toEqual(
      expect.objectContaining({
        ownerPath: 'RuntimeStore/React host',
        requiredCounters: expect.arrayContaining([
          'runtimeStore.runSyncFallbackAfterBoot',
          'runtimeStore.retainedTopicLeak',
        ]),
        forbiddenMigrationTargets: expect.arrayContaining(['React render fanout']),
      }),
    )
    expect(report.forbiddenClaims.join('\n')).toContain('before/after performance improvement')
  })

  it('keeps blocked markers and timeout cells visible as blocked evidence', () => {
    const report = buildKernelPerformanceKnobSnapshot({
      report: {
        ...baseReport,
        suites: [
          {
            id: 'react.strictSuspenseJitter',
            points: [{ params: { reactMode: 'strict' }, status: 'timeout', metrics: [], evidence: [] }],
          },
        ],
      },
      reportPath: 'perf/snapshot/raw/snapshot.json',
      markers: [{ phase: 'collect-snapshot', reason: 'timeout' }],
    })

    expect(report.summary.timeout).toBe(1)
    expect(report.summary.markers).toBe(1)
    expect(report.blocked.join('\n')).toContain('collect-snapshot: timeout')
    expect(report.requiredSuites.find((suite) => suite.id === 'react.strictSuspenseJitter')?.status).toBe('timeout')
  })

  it('materializes a blocked snapshot when the raw collect report is missing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-perf-snapshot-'))
    const outDir = path.join(root, 'out')
    const markerPath = path.join(root, 'collect-timeout.json')
    await fs.writeFile(
      markerPath,
      `${JSON.stringify({ phase: 'collect-snapshot', reason: 'timeout', status: 'blocked' })}\n`,
      'utf8',
    )

    const report = await runKernelPerformanceKnobSnapshotCli([
      '--report',
      path.join(root, 'missing.json'),
      '--out-dir',
      outDir,
      '--profile',
      'default',
      '--env-id',
      'gh-linux-x64',
      '--marker',
      markerPath,
      '--allow-missing-report',
    ])

    expect(report.summary.cells).toBe(0)
    expect(report.summary.markers).toBe(1)
    expect(report.blocked).toContain('collect-snapshot: timeout')
    await expect(fs.stat(path.join(outDir, 'reports', 'snapshot.default.json'))).resolves.toBeTruthy()
  })
})
