import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { assertNextActionsExecutionV1Schema } from '../../src/internal/protocol/schemaValidation.js'

const makeDeterministicRng = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

const pickRandom = <T>(items: ReadonlyArray<T>, next: () => number): T => {
  const index = Math.floor(next() * items.length)
  return items[index]!
}

const makeInvalidToken = (next: () => number): string => {
  const base = 'valid-token'
  const illegalFragments = ['A', '_', '.', '/', '?', '#', '@', '中', '\u0001']
  const fragment = pickRandom(illegalFragments, next)
  const pivot = Math.floor(next() * (base.length + 1))
  return `${base.slice(0, pivot)}${fragment}${base.slice(pivot)}`
}

describe('logix-cli integration (next-actions exec)', () => {
  it('默认模式下未知 action 仍必须 fail-fast，并输出来源追踪字段', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-exec-'))
    const reportPath = path.join(tmp, 'verify-loop.report.json')

    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-1',
          instanceId: 'verify-report-1-instance',
          mode: 'run',
          gateScope: 'runtime',
          txnSeq: 1,
          opSeq: 1,
          attemptSeq: 1,
          verdict: 'RETRYABLE',
          exitCode: 3,
          gateResults: [
            {
              gate: 'gate:test',
              status: 'retryable',
              durationMs: 1,
              command: 'fixture:retryable:gate:test',
              exitCode: 75,
              reasonCode: 'VERIFY_RETRYABLE',
            },
          ],
          reasonCode: 'VERIFY_RETRYABLE',
          reasons: [{ code: 'VERIFY_RETRYABLE', message: 'retry me' }],
          nextActions: [
            {
              id: 'run-command-ok',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
            },
            {
              id: 'rerun-verify-loop-ok',
              action: 'rerun-verify-loop',
              args: {
                runId: 'next-actions-rerun-1',
                mode: 'run',
                target: 'fixture:pass',
                gateScope: 'runtime',
                executor: 'fixture',
              },
            },
            {
              id: 'unsupported-safe-noop',
              action: 'inspect',
              args: {
                mode: 'manual',
              },
            },
            {
              id: 'missing-command-safe-noop',
              action: 'run-command',
              args: {},
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli(['next-actions', 'exec', '--runId', 'next-actions-exec-1', '--report', reportPath, '--out', tmp]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)

    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly runId: string
      readonly instanceId: string
      readonly txnSeq: number
      readonly opSeq: number
      readonly attemptSeq: number
      readonly sourceReportPath: string
      readonly sourceReportDigest: string
      readonly strict: boolean
      readonly engine: string
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string; readonly reason?: string }>
    }

    expect(executionReport.summary.executed).toBe(2)
    expect(executionReport.summary.failed).toBe(1)
    expect(executionReport.summary.noOp).toBe(0)
    expect(executionReport.runId).toBe('verify-report-1')
    expect(executionReport.instanceId).toBe('verify-report-1-instance')
    expect(executionReport.txnSeq).toBe(1)
    expect(executionReport.opSeq).toBe(1)
    expect(executionReport.attemptSeq).toBe(1)
    expect(executionReport.sourceReportPath).toBe(path.resolve(reportPath))
    expect(executionReport.sourceReportDigest.startsWith('sha256:')).toBe(true)
    expect(executionReport.strict).toBe(false)
    expect(executionReport.engine).toBe('bootstrap')
    assertNextActionsExecutionV1Schema(executionReport)
    expect(() =>
      assertNextActionsExecutionV1Schema({
        ...executionReport,
        __unknown__: true,
      }),
    ).toThrowError(/schema 校验失败/)

    const unsupportedResult = executionReport.results.find((item) => item.id === 'unsupported-safe-noop')
    expect(unsupportedResult?.status).toBe('failed')
    expect(unsupportedResult?.reason).toContain("unsupported action 'inspect'")
    expect(executionReport.results.some((item) => item.id === 'missing-command-safe-noop')).toBe(false)
  })

  it('strict 模式下未知 action 必须 fail-fast（不是 safe no-op）', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-strict-unknown-'))
    const reportPath = path.join(tmp, 'verify-loop.report.strict-unknown.json')

    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-strict-unknown-1',
          instanceId: 'verify-report-strict-unknown-1-instance',
          gateScope: 'runtime',
          txnSeq: 7,
          opSeq: 11,
          attemptSeq: 2,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'unknown-action-fail-fast',
              action: 'inspect',
              args: {
                mode: 'manual',
              },
            },
            {
              id: 'should-not-run-after-fail-fast',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli([
        'next-actions',
        'exec',
        '--runId',
        'next-actions-strict-unknown-1',
        '--report',
        reportPath,
        '--engine',
        'bootstrap',
        '--strict',
        '--out',
        tmp,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly strict: boolean
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string; readonly reason?: string }>
    }

    expect(executionReport.strict).toBe(true)
    expect(executionReport.summary.executed).toBe(0)
    expect(executionReport.summary.failed).toBe(1)
    expect(executionReport.summary.noOp).toBe(0)
    expect(executionReport.results.length).toBe(1)
    expect(executionReport.results[0]?.id).toBe('unknown-action-fail-fast')
    expect(executionReport.results[0]?.status).toBe('failed')
    expect(executionReport.results[0]?.reason).toContain("unsupported action 'inspect'")
  })

  it('strict 模式下缺必要 args 必须 fail-fast', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-strict-missing-'))
    const reportPath = path.join(tmp, 'verify-loop.report.strict-missing.json')

    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-strict-missing-1',
          instanceId: 'verify-report-strict-missing-1-instance',
          gateScope: 'runtime',
          txnSeq: 3,
          opSeq: 5,
          attemptSeq: 2,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'missing-command-fail-fast',
              action: 'run-command',
              args: {},
            },
            {
              id: 'should-not-run-after-missing-args',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli([
        'next-actions',
        'exec',
        '--runId',
        'next-actions-strict-missing-1',
        '--report',
        reportPath,
        '--strict',
        '--out',
        tmp,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string; readonly reason?: string }>
    }

    expect(executionReport.summary.executed).toBe(0)
    expect(executionReport.summary.failed).toBe(1)
    expect(executionReport.summary.noOp).toBe(0)
    expect(executionReport.results.length).toBe(1)
    expect(executionReport.results[0]?.id).toBe('missing-command-fail-fast')
    expect(executionReport.results[0]?.status).toBe('failed')
    expect(executionReport.results[0]?.reason).toContain('missing args.command')
  })

  it('accepts --dsl alias with next-actions array payload', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-dsl-'))
    const dslPath = path.join(tmp, 'next-actions.run.json')

    await fs.writeFile(
      dslPath,
      `${JSON.stringify(
        [
          {
            id: 'run-command-via-dsl',
            action: 'run-command',
            args: {
              command: process.execPath,
              argv: ['-e', 'process.exit(0)'],
            },
          },
        ],
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(runCli(['next-actions', 'exec', '--runId', 'next-actions-dsl-1', '--dsl', dslPath, '--out', tmp]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(true)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly sourceReasonCode: string
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
    }
    expect(executionReport.sourceReasonCode).toBe('NEXT_ACTIONS_DSL')
    expect(executionReport.summary.executed).toBe(1)
    expect(executionReport.summary.failed).toBe(0)
    expect(executionReport.summary.noOp).toBe(0)
  })

  it('DSL 注入未知字段时必须按非法协议拒绝（禁止静默容忍）', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-dsl-unknown-field-'))
    const dslPath = path.join(tmp, 'next-actions.run.json')

    await fs.writeFile(
      dslPath,
      `${JSON.stringify(
        [
          {
            id: 'run-command-via-dsl',
            action: 'run-command',
            args: {
              command: process.execPath,
              argv: ['-e', 'process.exit(0)'],
            },
            __unknown__: true,
          },
        ],
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(runCli(['next-actions', 'exec', '--runId', 'next-actions-dsl-unknown-field-1', '--dsl', dslPath, '--out', tmp]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
    expect(out.result.reasons[0]?.message).toContain('next-actions exec report 非法')
    expect(out.result.reasons[0]?.message).toContain('__unknown__')
  })

  it('DSL 的 ifReasonCodes 非字符串数组时必须拒绝（禁止降级为无条件执行）', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-dsl-invalid-reason-codes-'))
    const dslPath = path.join(tmp, 'next-actions.run.json')

    await fs.writeFile(
      dslPath,
      `${JSON.stringify(
        [
          {
            id: 'run-command-via-dsl',
            action: 'run-command',
            args: {
              command: process.execPath,
              argv: ['-e', 'process.exit(0)'],
            },
            ifReasonCodes: 'VERIFY_RETRYABLE',
          },
        ],
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli(['next-actions', 'exec', '--runId', 'next-actions-dsl-invalid-reason-codes-1', '--dsl', dslPath, '--out', tmp]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
    expect(out.result.reasons[0]?.message).toContain('next-actions exec report 非法')
    expect(out.result.reasons[0]?.message).toContain('ifReasonCodes')
  })

  it('DSL 的空 id/action 必须拒绝（禁止静默丢弃动作）', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-dsl-empty-id-'))
    const dslPath = path.join(tmp, 'next-actions.run.json')

    await fs.writeFile(
      dslPath,
      `${JSON.stringify(
        [
          {
            id: '   ',
            action: 'run-command',
            args: {
              command: process.execPath,
              argv: ['-e', 'process.exit(0)'],
            },
          },
        ],
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(runCli(['next-actions', 'exec', '--runId', 'next-actions-dsl-empty-id-1', '--dsl', dslPath, '--out', tmp]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
    expect(out.result.reasons[0]?.message).toContain('next-actions exec report 非法')
    expect(out.result.reasons[0]?.message).toContain('id')
  })

  it('fuzz: 超深嵌套 args payload 不应崩溃，且按协议返回', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-fuzz-deep-args-'))
    const reportPath = path.join(tmp, 'verify-loop.report.deep-args.json')

    let deepPayload: Record<string, unknown> = { leaf: 'ok' }
    for (let depth = 0; depth < 256; depth++) {
      deepPayload = { [`depth-${depth}`]: deepPayload }
    }

    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-fuzz-deep-args-1',
          instanceId: 'verify-report-fuzz-deep-args-1-instance',
          gateScope: 'runtime',
          txnSeq: 13,
          opSeq: 21,
          attemptSeq: 1,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'fuzz-deep-args',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
                payload: deepPayload,
              },
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(runCli(['next-actions', 'exec', '--runId', 'next-actions-fuzz-deep-args-1', '--report', reportPath, '--out', tmp]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(true)
    expect(out.result.exitCode).toBe(0)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string }>
    }

    expect(executionReport.summary.executed).toBe(1)
    expect(executionReport.summary.failed).toBe(0)
    expect(executionReport.summary.noOp).toBe(0)
    expect(executionReport.results[0]?.id).toBe('fuzz-deep-args')
    expect(executionReport.results[0]?.status).toBe('executed')
  })

  it('fuzz: 非法 Unicode/控制字符 id/action 必须拒绝', async () => {
    const cases = [
      {
        suffix: 'id-control-char',
        action: {
          id: 'bad-id-\u0000',
          action: 'run-command',
          args: {
            command: process.execPath,
            argv: ['-e', 'process.exit(0)'],
          },
        },
        expectedPath: 'nextActions[0].id',
      },
      {
        suffix: 'action-control-char',
        action: {
          id: 'fuzz-action-control-char',
          action: 'run-command\u0001',
          args: {
            command: process.execPath,
            argv: ['-e', 'process.exit(0)'],
          },
        },
        expectedPath: 'nextActions[0].action',
      },
      {
        suffix: 'id-unicode',
        action: {
          id: '非法-id',
          action: 'run-command',
          args: {
            command: process.execPath,
            argv: ['-e', 'process.exit(0)'],
          },
        },
        expectedPath: 'nextActions[0].id',
      },
      {
        suffix: 'action-unicode',
        action: {
          id: 'fuzz-action-unicode',
          action: '执行-command',
          args: {
            command: process.execPath,
            argv: ['-e', 'process.exit(0)'],
          },
        },
        expectedPath: 'nextActions[0].action',
      },
    ] as const

    for (const testCase of cases) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `logix-next-actions-fuzz-${testCase.suffix}-`))
      const dslPath = path.join(tmp, 'next-actions.run.json')

      await fs.writeFile(dslPath, `${JSON.stringify([testCase.action], null, 2)}\n`, 'utf8')

      const out = await Effect.runPromise(
        runCli(['next-actions', 'exec', '--runId', `next-actions-fuzz-${testCase.suffix}-1`, '--dsl', dslPath, '--out', tmp]),
      )

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.result.ok).toBe(false)
      expect(out.result.exitCode).toBe(2)
      expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
      expect(out.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
      expect(out.result.reasons[0]?.message).toContain('next-actions exec report 非法')
      expect(out.result.reasons[0]?.message).toContain(testCase.expectedPath)
    }
  })

  it('fuzz: 巨大 ifReasonCodes 应支持归一化，且非法项必须拒绝', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-fuzz-huge-reason-codes-'))
    const validReportPath = path.join(tmp, 'verify-loop.report.huge-reason-codes.valid.json')
    const invalidReportPath = path.join(tmp, 'verify-loop.report.huge-reason-codes.invalid.json')

    const largeReasonCodes: string[] = []
    for (let i = 0; i < 4096; i++) {
      largeReasonCodes.push(`reason-${(i % 41).toString().padStart(2, '0')}`)
    }
    largeReasonCodes.push(' VERIFY_RETRYABLE ')
    largeReasonCodes.push('VERIFY_RETRYABLE')
    largeReasonCodes.push('reason-00')

    await fs.writeFile(
      validReportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-fuzz-huge-reason-codes-valid-1',
          instanceId: 'verify-report-fuzz-huge-reason-codes-valid-1-instance',
          gateScope: 'runtime',
          txnSeq: 31,
          opSeq: 44,
          attemptSeq: 1,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'fuzz-huge-reason-codes-valid',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
              ifReasonCodes: largeReasonCodes,
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const validOut = await Effect.runPromise(
      runCli(['next-actions', 'exec', '--runId', 'next-actions-fuzz-huge-reason-codes-valid-1', '--report', validReportPath, '--out', tmp]),
    )

    expect(validOut.kind).toBe('result')
    if (validOut.kind !== 'result') throw new Error('expected result')
    expect(validOut.result.ok).toBe(true)
    expect(validOut.result.exitCode).toBe(0)

    const validExecutionArtifact = validOut.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(validExecutionArtifact).toBeDefined()
    expect(typeof validExecutionArtifact?.file).toBe('string')
    const validExecutionFilePath = path.resolve(tmp, validExecutionArtifact!.file!)
    const validExecutionReport = JSON.parse(await fs.readFile(validExecutionFilePath, 'utf8')) as {
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string }>
    }
    expect(validExecutionReport.summary.executed).toBe(1)
    expect(validExecutionReport.summary.failed).toBe(0)
    expect(validExecutionReport.summary.noOp).toBe(0)
    expect(validExecutionReport.results[0]?.id).toBe('fuzz-huge-reason-codes-valid')
    expect(validExecutionReport.results[0]?.status).toBe('executed')

    await fs.writeFile(
      invalidReportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-fuzz-huge-reason-codes-invalid-1',
          instanceId: 'verify-report-fuzz-huge-reason-codes-invalid-1-instance',
          gateScope: 'runtime',
          txnSeq: 31,
          opSeq: 45,
          attemptSeq: 1,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'fuzz-huge-reason-codes-invalid',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
              ifReasonCodes: [...largeReasonCodes, 123],
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const invalidOut = await Effect.runPromise(
      runCli(['next-actions', 'exec', '--runId', 'next-actions-fuzz-huge-reason-codes-invalid-1', '--report', invalidReportPath, '--out', tmp]),
    )

    expect(invalidOut.kind).toBe('result')
    if (invalidOut.kind !== 'result') throw new Error('expected result')
    expect(invalidOut.result.ok).toBe(false)
    expect(invalidOut.result.exitCode).toBe(2)
    expect(invalidOut.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(invalidOut.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
    expect(invalidOut.result.reasons[0]?.message).toContain('next-actions exec report 非法')
    expect(invalidOut.result.reasons[0]?.message).toContain('ifReasonCode')
  })

  it('fuzz: 混合合法/非法 actions 在 strict 模式必须 fail-fast', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-fuzz-mixed-strict-'))
    const reportPath = path.join(tmp, 'verify-loop.report.mixed-strict.json')

    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'VerifyLoopReport',
          runId: 'verify-report-fuzz-mixed-strict-1',
          instanceId: 'verify-report-fuzz-mixed-strict-1-instance',
          gateScope: 'runtime',
          txnSeq: 51,
          opSeq: 3,
          attemptSeq: 1,
          reasonCode: 'VERIFY_RETRYABLE',
          nextActions: [
            {
              id: 'fuzz-mixed-valid-first',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
            },
            {
              id: 'fuzz-mixed-invalid-middle',
              action: 'inspect',
              args: {
                mode: 'manual',
              },
            },
            {
              id: 'fuzz-mixed-valid-after-invalid',
              action: 'run-command',
              args: {
                command: process.execPath,
                argv: ['-e', 'process.exit(0)'],
              },
            },
          ],
          artifacts: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli([
        'next-actions',
        'exec',
        '--runId',
        'next-actions-fuzz-mixed-strict-1',
        '--report',
        reportPath,
        '--strict',
        '--out',
        tmp,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)

    const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
    const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
      readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string; readonly reason?: string }>
    }

    expect(executionReport.summary.executed).toBe(1)
    expect(executionReport.summary.failed).toBe(1)
    expect(executionReport.summary.noOp).toBe(0)
    expect(executionReport.results.length).toBe(2)
    expect(executionReport.results[0]?.id).toBe('fuzz-mixed-valid-first')
    expect(executionReport.results[0]?.status).toBe('executed')
    expect(executionReport.results[1]?.id).toBe('fuzz-mixed-invalid-middle')
    expect(executionReport.results[1]?.status).toBe('failed')
    expect(executionReport.results[1]?.reason).toContain("unsupported action 'inspect'")
    expect(executionReport.results.some((item) => item.id === 'fuzz-mixed-valid-after-invalid')).toBe(false)
  })

  it('property-style: 随机非法 token 输入应稳定 fail-fast（不产出执行报告）', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-property-invalid-token-'))
    const dslPath = path.join(tmp, 'next-actions.run.json')
    const next = makeDeterministicRng(0x103_2026)

    for (let caseIndex = 0; caseIndex < 24; caseIndex += 1) {
      const breakId = caseIndex % 2 === 0
      const invalidToken = makeInvalidToken(next)
      const action = {
        id: breakId ? invalidToken : 'valid-id',
        action: breakId ? 'run-command' : invalidToken,
        args: {
          command: process.execPath,
          argv: ['-e', 'process.exit(0)'],
        },
      }

      await fs.writeFile(dslPath, `${JSON.stringify([action], null, 2)}\n`, 'utf8')

      const out = await Effect.runPromise(
        runCli(['next-actions', 'exec', '--runId', `next-actions-property-invalid-token-${caseIndex}`, '--dsl', dslPath, '--out', tmp]),
      )

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.result.ok).toBe(false)
      expect(out.result.exitCode).toBe(2)
      expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
      expect(out.result.artifacts.some((item) => item.outputKey === 'nextActionsExecution')).toBe(false)
      expect(out.result.reasons[0]?.message).toContain('next-actions exec report 非法')
      expect(out.result.reasons[0]?.message).toContain(breakId ? '.id' : '.action')
    }
  })

  it('property-style: strict 模式随机合法前缀 + 非法动作应在首个非法处停止', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-next-actions-property-strict-prefix-'))
    const reportPath = path.join(tmp, 'verify-loop.report.property-strict-prefix.json')
    const next = makeDeterministicRng(0xCAFE_BABE)

    for (let caseIndex = 0; caseIndex < 12; caseIndex += 1) {
      const validPrefix = Math.floor(next() * 6)
      const nextActions: Array<{ id: string; action: string; args: Record<string, unknown> }> = Array.from(
        { length: validPrefix },
        (_, idx) => ({
          id: `property-valid-${caseIndex}-${idx}`,
          action: 'run-command',
          args: {
            command: process.execPath,
            argv: ['-e', 'process.exit(0)'],
          },
        }),
      )
      nextActions.push({
        id: `property-invalid-${caseIndex}`,
        action: 'inspect',
        args: { mode: 'manual' },
      })
      nextActions.push({
        id: `property-valid-tail-${caseIndex}`,
        action: 'run-command',
        args: {
          command: process.execPath,
          argv: ['-e', 'process.exit(0)'],
        },
      })

      await fs.writeFile(
        reportPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            kind: 'VerifyLoopReport',
            runId: `verify-report-property-strict-prefix-${caseIndex}`,
            instanceId: `verify-report-property-strict-prefix-${caseIndex}-instance`,
            gateScope: 'runtime',
            txnSeq: caseIndex + 1,
            opSeq: caseIndex + 1,
            attemptSeq: 1,
            reasonCode: 'VERIFY_RETRYABLE',
            nextActions,
            artifacts: [],
          },
          null,
          2,
        )}\n`,
        'utf8',
      )

      const out = await Effect.runPromise(
        runCli([
          'next-actions',
          'exec',
          '--runId',
          `next-actions-property-strict-prefix-${caseIndex}`,
          '--report',
          reportPath,
          '--strict',
          '--out',
          tmp,
        ]),
      )

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.result.ok).toBe(false)
      expect(out.result.exitCode).toBe(2)

      const executionArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
      expect(executionArtifact).toBeDefined()
      expect(typeof executionArtifact?.file).toBe('string')
      const executionFilePath = path.resolve(tmp, executionArtifact!.file!)
      const executionReport = JSON.parse(await fs.readFile(executionFilePath, 'utf8')) as {
        readonly summary: { readonly executed: number; readonly failed: number; readonly noOp: number }
        readonly results: ReadonlyArray<{ readonly id: string; readonly status: string }>
      }

      expect(executionReport.summary.executed).toBe(validPrefix)
      expect(executionReport.summary.failed).toBe(1)
      expect(executionReport.summary.noOp).toBe(0)
      expect(executionReport.results.length).toBe(validPrefix + 1)
      expect(executionReport.results[validPrefix]?.id).toBe(`property-invalid-${caseIndex}`)
      expect(executionReport.results[validPrefix]?.status).toBe('failed')
      expect(executionReport.results.some((item) => item.id === `property-valid-tail-${caseIndex}`)).toBe(false)
    }
  })
})
