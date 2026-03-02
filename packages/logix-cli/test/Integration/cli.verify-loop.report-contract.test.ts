import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { assertVerifyLoopReportV1Schema } from '../../src/internal/protocol/schemaValidation.js'
import { extractVerdictExitCodeMap, loadVerifyLoopReportSchema, rootAdditionalPropertiesStrict } from '../helpers/verifyLoopSchema.js'

describe('logix-cli integration (verify-loop report contract)', () => {
  it('keeps report in strict schema and verdict/exitCode alignment', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const verdictExitMap = extractVerdictExitCodeMap(schema)
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-contract-1', '--mode', 'run', '--target', 'fixture:violation']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const report = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')?.inline as Record<string, unknown>
    expect(report).toBeDefined()
    expect(rootAdditionalPropertiesStrict(schema)).toBe(true)
    assertVerifyLoopReportV1Schema(report)

    const allowedFields = new Set(Object.keys(schema.properties ?? {}))
    const unknownField = Object.keys(report).find((key) => !allowedFields.has(key))
    expect(unknownField).toBeUndefined()

    const injected = { ...report, __unknown__: 1 }
    const injectedUnknown = Object.keys(injected).find((key) => !allowedFields.has(key))
    expect(injectedUnknown).toBe('__unknown__')
    expect(() => assertVerifyLoopReportV1Schema(injected)).toThrowError(/schema 校验失败/)

    const verdict = report.verdict as keyof typeof verdictExitMap
    expect(report.exitCode).toBe(verdictExitMap[verdict])
  })
})
