import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { toCommandResultV2 } from '../../src/internal/protocol/commandResultAdapter.js'
import { makeInstanceIdFromRun } from '../../src/internal/protocol/identity.js'
import { makeCommandResult } from '../../src/internal/result.js'

const makeVerifyLoopReport = (args: {
  readonly runId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly trajectory?: ReadonlyArray<{ readonly attemptSeq: number; readonly reasonCode: string }>
}) => ({
  schemaVersion: 1,
  kind: 'VerifyLoopReport',
  runId: args.runId,
  instanceId: args.instanceId,
  mode: args.attemptSeq > 1 ? 'resume' : ('run' as const),
  ...(args.attemptSeq > 1 ? { previousRunId: `${args.runId}-prev` } : null),
  gateScope: 'runtime' as const,
  txnSeq: args.txnSeq,
  opSeq: args.opSeq,
  attemptSeq: args.attemptSeq,
  verdict: 'PASS' as const,
  exitCode: 0,
  gateResults: [
    {
      gate: 'gate:type' as const,
      status: 'pass' as const,
      durationMs: 1,
      command: 'fixture:pass:gate:type',
      exitCode: 0,
    },
  ],
  reasonCode: 'VERIFY_PASS',
  reasons: [{ code: 'VERIFY_PASS', message: 'all gates pass' }],
  trajectory: args.trajectory ?? [{ attemptSeq: args.attemptSeq, reasonCode: 'VERIFY_PASS' }],
  nextActions: [],
  artifacts: [],
})

const expectFallbackIdentity = (args: {
  readonly runId: string
  readonly value: ReturnType<typeof toCommandResultV2>
}) => {
  expect(args.value.instanceId).toBe(makeInstanceIdFromRun(args.runId))
  expect(args.value.txnSeq).toBe(1)
  expect(args.value.opSeq).toBe(1)
  expect(args.value.attemptSeq).toBe(1)
  expect(args.value.reasonCode).toBe('VERIFY_PASS')
  expect(args.value.trajectory).toEqual([{ attemptSeq: 1, reasonCode: 'VERIFY_PASS' }])
}

const makeDeterministicRng = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return state / 0x1_0000_0000
  }
}

const pickRandom = <T>(items: ReadonlyArray<T>, next: () => number): T => {
  const index = Math.floor(next() * items.length)
  return items[index]!
}

describe('contracts 103 identity chain consistency', () => {
  it('keeps result/report/verdict identity chain and trajectory consistent', () => {
    const report = makeVerifyLoopReport({
      runId: 'identity-chain-attempt-02',
      instanceId: 'identity-chain',
      txnSeq: 2,
      opSeq: 2,
      attemptSeq: 2,
      trajectory: [
        { attemptSeq: 1, reasonCode: 'VERIFY_RETRYABLE' },
        { attemptSeq: 2, reasonCode: 'VERIFY_PASS' },
      ],
    })
    const verdict = {
      schemaVersion: 1,
      kind: 'AutonomousLoopVerdict',
      decision: {
        finalIdentity: {
          instanceId: report.instanceId,
          txnSeq: report.txnSeq,
          opSeq: report.opSeq,
          attemptSeq: report.attemptSeq,
          trajectory: report.trajectory,
        },
        identityChain: [
          {
            runId: 'identity-chain-attempt-01',
            mode: 'run',
            instanceId: report.instanceId,
            txnSeq: 1,
            opSeq: 1,
            attemptSeq: 1,
            reasonCode: 'VERIFY_RETRYABLE',
            trajectory: [{ attemptSeq: 1, reasonCode: 'VERIFY_RETRYABLE' }],
          },
          {
            runId: report.runId,
            mode: report.mode,
            instanceId: report.instanceId,
            txnSeq: report.txnSeq,
            opSeq: report.opSeq,
            attemptSeq: report.attemptSeq,
            reasonCode: report.reasonCode,
            trajectory: report.trajectory,
          },
        ],
      },
    } as const

    const v1 = makeCommandResult({
      runId: 'identity-chain-attempt-02',
      command: 'verify-loop',
      ok: true,
      exitCode: 0,
      artifacts: [
        {
          outputKey: 'verifyLoopReport',
          kind: 'VerifyLoopReport',
          ok: true,
          inline: report,
        },
      ],
    })

    const v2 = toCommandResultV2(v1)
    expect(v2.instanceId).toBe(report.instanceId)
    expect(v2.txnSeq).toBe(report.txnSeq)
    expect(v2.opSeq).toBe(report.opSeq)
    expect(v2.attemptSeq).toBe(report.attemptSeq)
    expect(v2.reasonCode).toBe(report.reasonCode)
    expect(v2.exitCode).toBe(report.exitCode)
    expect(v2.trajectory).toEqual(report.trajectory)
    expect(verdict.decision.finalIdentity.instanceId).toBe(v2.instanceId)
    expect(verdict.decision.finalIdentity.txnSeq).toBe(v2.txnSeq)
    expect(verdict.decision.finalIdentity.opSeq).toBe(v2.opSeq)
    expect(verdict.decision.finalIdentity.attemptSeq).toBe(v2.attemptSeq)
    expect(verdict.decision.finalIdentity.trajectory).toEqual(v2.trajectory)
    expect(verdict.decision.identityChain[1]).toEqual({
      runId: report.runId,
      mode: report.mode,
      instanceId: v2.instanceId,
      txnSeq: v2.txnSeq,
      opSeq: v2.opSeq,
      attemptSeq: v2.attemptSeq,
      reasonCode: v2.reasonCode,
      trajectory: v2.trajectory,
    })
  })

  it('reads verify-loop report from out-mode absolute file path deterministically', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-out-'))
    try {
      const runId = 'identity-file-attempt-02'
      const report = makeVerifyLoopReport({
        runId,
        instanceId: 'identity-file',
        txnSeq: 2,
        opSeq: 2,
        attemptSeq: 2,
        trajectory: [
          { attemptSeq: 1, reasonCode: 'VERIFY_RETRYABLE' },
          { attemptSeq: 2, reasonCode: 'VERIFY_PASS' },
        ],
      })
      const reportPath = path.join(tmp, 'verify-loop.report.json')
      await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

      const v1 = makeCommandResult({
        runId,
        command: 'verify-loop',
        ok: true,
        exitCode: 0,
        artifacts: [
          {
            outputKey: 'verifyLoopReport',
            kind: 'VerifyLoopReport',
            ok: true,
            file: reportPath,
          },
        ],
      })

      const a = toCommandResultV2(v1)
      const b = toCommandResultV2(v1)

      expect(a).toEqual(b)
      expect(a.instanceId).toBe(report.instanceId)
      expect(a.txnSeq).toBe(report.txnSeq)
      expect(a.opSeq).toBe(report.opSeq)
      expect(a.attemptSeq).toBe(report.attemptSeq)
      expect(a.reasonCode).toBe(report.reasonCode)
      expect(a.trajectory).toEqual(report.trajectory)
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('reads verify-loop report from out-mode relative file path consistently with absolute path', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-relative-'))
    try {
      const runId = 'identity-file-relative-attempt-02'
      const report = makeVerifyLoopReport({
        runId,
        instanceId: 'identity-file-relative',
        txnSeq: 2,
        opSeq: 2,
        attemptSeq: 2,
        trajectory: [
          { attemptSeq: 1, reasonCode: 'VERIFY_RETRYABLE' },
          { attemptSeq: 2, reasonCode: 'VERIFY_PASS' },
        ],
      })
      const canonicalTmp = await fs.realpath(tmp)
      const absoluteReportPath = path.join(canonicalTmp, 'verify-loop.report.json')
      await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      const previousCwd = process.cwd()
      process.chdir(canonicalTmp)
      const relativeReportPath = path.relative(process.cwd(), absoluteReportPath)

      try {
        const fromAbsolute = toCommandResultV2(
          makeCommandResult({
            runId,
            command: 'verify-loop',
            ok: true,
            exitCode: 0,
            artifacts: [
              {
                outputKey: 'verifyLoopReport',
                kind: 'VerifyLoopReport',
                ok: true,
                file: absoluteReportPath,
              },
            ],
          }),
        )
        const fromRelative = toCommandResultV2(
          makeCommandResult({
            runId,
            command: 'verify-loop',
            ok: true,
            exitCode: 0,
            artifacts: [
              {
                outputKey: 'verifyLoopReport',
                kind: 'VerifyLoopReport',
                ok: true,
                file: relativeReportPath,
              },
            ],
          }),
        )

        expect(fromRelative.instanceId).toBe(fromAbsolute.instanceId)
        expect(fromRelative.txnSeq).toBe(fromAbsolute.txnSeq)
        expect(fromRelative.opSeq).toBe(fromAbsolute.opSeq)
        expect(fromRelative.attemptSeq).toBe(fromAbsolute.attemptSeq)
        expect(fromRelative.reasonCode).toBe(fromAbsolute.reasonCode)
        expect(fromRelative.reasons).toEqual(fromAbsolute.reasons)
        expect(fromRelative.nextActions).toEqual(fromAbsolute.nextActions)
        expect(fromRelative.trajectory).toEqual(fromAbsolute.trajectory)
        expect(fromRelative.instanceId).toBe(report.instanceId)
        expect(fromRelative.txnSeq).toBe(report.txnSeq)
        expect(fromRelative.opSeq).toBe(report.opSeq)
        expect(fromRelative.attemptSeq).toBe(report.attemptSeq)
        expect(fromRelative.reasonCode).toBe(report.reasonCode)
        expect(fromRelative.trajectory).toEqual(report.trajectory)
      } finally {
        process.chdir(previousCwd)
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('reads verify-loop report from out-mode dot-relative file path consistently', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-dot-relative-'))
    try {
      const runId = 'identity-file-dot-relative-attempt-02'
      const report = makeVerifyLoopReport({
        runId,
        instanceId: 'identity-file-dot-relative',
        txnSeq: 2,
        opSeq: 2,
        attemptSeq: 2,
      })
      const canonicalTmp = await fs.realpath(tmp)
      const absoluteReportPath = path.join(canonicalTmp, 'verify-loop.report.json')
      await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      const previousCwd = process.cwd()
      process.chdir(canonicalTmp)

      try {
        const fromDotRelative = toCommandResultV2(
          makeCommandResult({
            runId,
            command: 'verify-loop',
            ok: true,
            exitCode: 0,
            artifacts: [
              {
                outputKey: 'verifyLoopReport',
                kind: 'VerifyLoopReport',
                ok: true,
                file: './verify-loop.report.json',
              },
            ],
          }),
        )

        expect(fromDotRelative.instanceId).toBe(report.instanceId)
        expect(fromDotRelative.txnSeq).toBe(report.txnSeq)
        expect(fromDotRelative.opSeq).toBe(report.opSeq)
        expect(fromDotRelative.attemptSeq).toBe(report.attemptSeq)
        expect(fromDotRelative.reasonCode).toBe(report.reasonCode)
        expect(fromDotRelative.trajectory).toEqual(report.trajectory)
      } finally {
        process.chdir(previousCwd)
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('fails safe for invalid/unreadable verify-loop report file paths and avoids identity drift', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-path-'))
    try {
      const runId = 'identity-path-safe-attempt-02'
      const driftedReport = makeVerifyLoopReport({
        runId,
        instanceId: 'drifted-identity',
        txnSeq: 99,
        opSeq: 99,
        attemptSeq: 99,
      })

      const validReportFile = path.join(tmp, 'verify-loop.report.json')
      const wrongNameFile = path.join(tmp, 'other.report.json')
      const unreadableReportDir = path.join(tmp, 'unreadable-as-directory', 'verify-loop.report.json')
      const missingReportFile = path.join(tmp, 'missing', 'verify-loop.report.json')
      await fs.writeFile(validReportFile, `${JSON.stringify(driftedReport, null, 2)}\n`, 'utf8')
      await fs.writeFile(wrongNameFile, `${JSON.stringify(driftedReport, null, 2)}\n`, 'utf8')
      await fs.mkdir(unreadableReportDir, { recursive: true })

      const abnormalPaths = [
        `${tmp}/nested/../verify-loop.report.json`,
        wrongNameFile,
        unreadableReportDir,
        missingReportFile,
      ]

      for (const filePath of abnormalPaths) {
        const v1 = makeCommandResult({
          runId,
          command: 'verify-loop',
          ok: true,
          exitCode: 0,
          artifacts: [
            {
              outputKey: 'verifyLoopReport',
              kind: 'VerifyLoopReport',
              ok: true,
              file: filePath,
            },
          ],
        })

        const v2 = toCommandResultV2(v1)
        expectFallbackIdentity({
          runId,
          value: v2,
        })
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('fails safe for verify-loop artifact file paths with NUL bytes or illegal characters', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-path-fuzz-'))
    try {
      const runId = 'identity-path-fuzz-attempt-02'
      const driftedReport = makeVerifyLoopReport({
        runId,
        instanceId: 'drifted-by-path-fuzz',
        txnSeq: 42,
        opSeq: 42,
        attemptSeq: 42,
      })

      const legalFile = path.join(tmp, 'verify-loop.report.json')
      await fs.writeFile(legalFile, `${JSON.stringify(driftedReport, null, 2)}\n`, 'utf8')

      const illegalCharDir = path.join(tmp, 'illegal<segment>')
      await fs.mkdir(illegalCharDir, { recursive: true })
      const illegalCharacterPath = path.join(illegalCharDir, 'verify-loop.report.json')
      await fs.writeFile(illegalCharacterPath, `${JSON.stringify(driftedReport, null, 2)}\n`, 'utf8')

      const fuzzedPaths = [
        `${legalFile}\u0000poison`,
        illegalCharacterPath,
      ]

      for (const filePath of fuzzedPaths) {
        const v2 = toCommandResultV2(
          makeCommandResult({
            runId,
            command: 'verify-loop',
            ok: true,
            exitCode: 0,
            artifacts: [
              {
                outputKey: 'verifyLoopReport',
                kind: 'VerifyLoopReport',
                ok: true,
                file: filePath,
              },
            ],
          }),
        )

        expectFallbackIdentity({
          runId,
          value: v2,
        })
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('fails safe when verify-loop artifact contains both inline and file carrier', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-command-result-adapter-carrier-fuzz-'))
    try {
      const runId = 'identity-carrier-fuzz-attempt-02'
      const fileReport = makeVerifyLoopReport({
        runId,
        instanceId: 'from-file',
        txnSeq: 2,
        opSeq: 2,
        attemptSeq: 2,
      })
      const inlineReport = makeVerifyLoopReport({
        runId,
        instanceId: 'from-inline',
        txnSeq: 9,
        opSeq: 9,
        attemptSeq: 9,
      })
      const reportPath = path.join(tmp, 'verify-loop.report.json')
      await fs.writeFile(reportPath, `${JSON.stringify(fileReport, null, 2)}\n`, 'utf8')

      const v2 = toCommandResultV2(
        makeCommandResult({
          runId,
          command: 'verify-loop',
          ok: true,
          exitCode: 0,
          artifacts: [
            {
              outputKey: 'verifyLoopReport',
              kind: 'VerifyLoopReport',
              ok: true,
              file: reportPath,
              inline: inlineReport,
            },
          ],
        }),
      )

      expectFallbackIdentity({
        runId,
        value: v2,
      })
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('fails safe when verify-loop report payload is polluted by invalid identity field type', () => {
    const runId = 'identity-polluted-json-attempt-02'
    const pollutedReport = {
      ...makeVerifyLoopReport({
        runId,
        instanceId: 'polluted-json',
        txnSeq: 7,
        opSeq: 7,
        attemptSeq: 7,
      }),
      identity: 'not-an-object',
    }

    const v2 = toCommandResultV2(
      makeCommandResult({
        runId,
        command: 'verify-loop',
        ok: true,
        exitCode: 0,
        artifacts: [
          {
            outputKey: 'verifyLoopReport',
            kind: 'VerifyLoopReport',
            ok: true,
            inline: pollutedReport,
          },
        ],
      }),
    )

    expectFallbackIdentity({
      runId,
      value: v2,
    })
  })

  it('accepts large but legal verify-loop report without false identity drift', () => {
    const runId = 'identity-large-payload-attempt-64'
    const trajectory = Array.from({ length: 64 }, (_, index) => ({
      attemptSeq: index + 1,
      reasonCode: index + 1 === 64 ? 'VERIFY_PASS' : 'VERIFY_RETRYABLE',
    }))
    const largeReport = {
      ...makeVerifyLoopReport({
        runId,
        instanceId: 'identity-large-payload',
        txnSeq: 64,
        opSeq: 64,
        attemptSeq: 64,
        trajectory,
      }),
      reasons: Array.from({ length: 512 }, (_, index) => ({
        code: 'VERIFY_PASS',
        message: `large-reason-${index}-${'x'.repeat(256)}`,
      })),
      nextActions: Array.from({ length: 256 }, (_, index) => ({
        id: `inspect-large-${index}`,
        action: 'inspect',
      })),
    }

    const v2 = toCommandResultV2(
      makeCommandResult({
        runId,
        command: 'verify-loop',
        ok: true,
        exitCode: 0,
        artifacts: [
          {
            outputKey: 'verifyLoopReport',
            kind: 'VerifyLoopReport',
            ok: true,
            inline: largeReport,
          },
        ],
      }),
    )

    expect(v2.instanceId).toBe(largeReport.instanceId)
    expect(v2.txnSeq).toBe(largeReport.txnSeq)
    expect(v2.opSeq).toBe(largeReport.opSeq)
    expect(v2.attemptSeq).toBe(largeReport.attemptSeq)
    expect(v2.reasonCode).toBe(largeReport.reasonCode)
    expect(v2.reasons.length).toBe(largeReport.reasons.length)
    expect(v2.nextActions.length).toBe(largeReport.nextActions.length)
    expect(v2.trajectory).toEqual(trajectory)
  })

  it('property-style: 随机非法 artifact.file 路径应稳定 fail-safe 回退 identity', () => {
    const next = makeDeterministicRng(0xAA55_2026)
    const runIdPrefix = 'identity-path-property-fallback'
    const illegalFragments = ['\u0000', '<', '>', '"', '|', '?', '*', '..']
    const templates = [
      '/tmp/property/verify-loop.report.json',
      '/tmp/property/nested/verify-loop.report.json',
      '/tmp/property/other.report.json',
      './verify-loop.report.json',
      '../verify-loop.report.json',
      '/tmp/property/verify-loop.report.json.bak',
    ]

    for (let caseIndex = 0; caseIndex < 40; caseIndex += 1) {
      const runId = `${runIdPrefix}-${caseIndex}`
      const baseTemplate = pickRandom(templates, next)
      const marker = pickRandom(illegalFragments, next)
      const pivot = Math.floor(next() * (baseTemplate.length + 1))
      const poisonedPath = `${baseTemplate.slice(0, pivot)}${marker}${baseTemplate.slice(pivot)}`

      const v2 = toCommandResultV2(
        makeCommandResult({
          runId,
          command: 'verify-loop',
          ok: true,
          exitCode: 0,
          artifacts: [
            {
              outputKey: 'verifyLoopReport',
              kind: 'VerifyLoopReport',
              ok: true,
              file: poisonedPath,
            },
          ],
        }),
      )

      expectFallbackIdentity({
        runId,
        value: v2,
      })
    }
  })

  it('property-style: 随机污染 identity 字段应 fail-safe，不采纳 report identity', () => {
    const next = makeDeterministicRng(0xBEEF_1030)

    for (let caseIndex = 0; caseIndex < 36; caseIndex += 1) {
      const runId = `identity-polluted-property-${caseIndex}`
      const baseReport = makeVerifyLoopReport({
        runId,
        instanceId: `identity-polluted-property-${caseIndex}-instance`,
        txnSeq: 3,
        opSeq: 3,
        attemptSeq: 3,
      }) as Record<string, unknown>

      const mutation = Math.floor(next() * 7)
      if (mutation === 0) {
        baseReport.identity = 'not-an-object'
      } else if (mutation === 1) {
        baseReport.identity = { instanceId: '', txnSeq: 3, opSeq: 3, attemptSeq: 3 }
      } else if (mutation === 2) {
        baseReport.identity = { instanceId: baseReport.instanceId, txnSeq: 0, opSeq: 3, attemptSeq: 3 }
      } else if (mutation === 3) {
        baseReport.identity = { instanceId: baseReport.instanceId, txnSeq: 3, opSeq: '3', attemptSeq: 3 }
      } else if (mutation === 4) {
        baseReport.identity = { instanceId: 'drifted-id', txnSeq: 3, opSeq: 3, attemptSeq: 3 }
      } else if (mutation === 5) {
        baseReport.identity = { instanceId: baseReport.instanceId, txnSeq: 3, opSeq: 3, attemptSeq: 99 }
      } else {
        baseReport.identity = { instanceId: baseReport.instanceId, txnSeq: 3, opSeq: 3 }
      }

      const v2 = toCommandResultV2(
        makeCommandResult({
          runId,
          command: 'verify-loop',
          ok: true,
          exitCode: 0,
          artifacts: [
              {
                outputKey: 'verifyLoopReport',
                kind: 'VerifyLoopReport',
                ok: true,
                inline: baseReport as any,
              },
            ],
          }),
        )

      expectFallbackIdentity({
        runId,
        value: v2,
      })
    }
  })
})
