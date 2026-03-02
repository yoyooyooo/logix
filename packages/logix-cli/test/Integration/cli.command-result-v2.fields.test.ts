import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { makeCommandResultV2 } from '../../src/internal/protocol/resultV2.js'
import { assertCommandResultV2Schema } from '../../src/internal/protocol/schemaValidation.js'
import { runCliPipeline } from '../../src/internal/runtime/pipeline.js'

describe('logix-cli integration (command result v2 fields)', () => {
  it('exposes required v2 protocol fields for successful commands', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'v2-fields-ok', '--json']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(0)
    expect(out.result.schemaVersion).toBe(2)
    expect(out.result.kind).toBe('CommandResult')
    expect(out.result.instanceId).toBe('v2-fields-ok')
    expect(out.result.txnSeq).toBe(1)
    expect(out.result.opSeq).toBe(1)
    expect(out.result.attemptSeq).toBe(1)
    expect(out.result.reasonCode).toBe('VERIFY_PASS')
    expect(out.result.nextActions).toEqual([])
    expect(out.result.trajectory).toEqual([{ attemptSeq: 1, reasonCode: 'VERIFY_PASS' }])
    assertCommandResultV2Schema(out.result)

    expect(out.result.artifacts.length).toBeGreaterThan(0)
    for (const artifact of out.result.artifacts) {
      expect(artifact.outputKey.length).toBeGreaterThan(0)
      expect(artifact.kind.length).toBeGreaterThan(0)

      const hasFile = Object.prototype.hasOwnProperty.call(artifact, 'file')
      const hasInline = Object.prototype.hasOwnProperty.call(artifact, 'inline')
      expect(hasFile === hasInline).toBe(false)

      if (hasFile) {
        expect((artifact.file ?? '').length).toBeGreaterThan(0)
      } else {
        expect(typeof artifact.inline).not.toBe('undefined')
      }

      if (artifact.ok) {
        expect(Object.prototype.hasOwnProperty.call(artifact, 'error')).toBe(false)
      } else {
        expect(artifact.error?.message).toBeTruthy()
      }
    }

    const controlEventsArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'controlEvents')
    expect(controlEventsArtifact).toBeDefined()
    const controlEvents = (controlEventsArtifact?.inline as { readonly events: ReadonlyArray<{ readonly event: string }> })?.events ?? []
    expect(controlEvents.map((item) => item.event)).toEqual([
      'parse.completed',
      'normalize.completed',
      'validate.completed',
      'execute.completed',
      'emit.completed',
    ])
  })

  it('maps usage errors to v2 violation envelope', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'v2-fields-invalid']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.schemaVersion).toBe(2)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.reasons[0]?.code).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.nextActions[0]?.id).toBe('fix-and-rerun')
    assertCommandResultV2Schema(out.result)
  })

  it('emit 阶段 instanceId 不匹配 schema 时会走协议错误路径', async () => {
    const out = await Effect.runPromise(
      runCliPipeline({
        argv: ['describe', '--runId', 'v2-fields-emit-fail-fast', '--json'],
        helpText: 'logix test help',
        runCommand: (invocation) =>
          Effect.succeed(
            {
              ...makeCommandResultV2({
                runId: invocation.global.runId,
                instanceId: invocation.global.runId,
                txnSeq: 1,
                opSeq: 1,
                attemptSeq: 1,
                command: invocation.command,
                verdict: 'PASS',
                reasonCode: 'VERIFY_PASS',
                reasons: [{ code: 'VERIFY_PASS', message: 'valid-before-emit' }],
                artifacts: [],
              }),
              instanceId: 'INVALID_INSTANCE_ID',
            } as any,
          ),
      }),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('emit 阶段协议校验失败')
    expect(out.result.reasons[0]?.message).toContain('$.instanceId')
    assertCommandResultV2Schema(out.result)
  })
})
