import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const UNRESOLVED_ENTRY_PLACEHOLDER = '__LOGIX_UNRESOLVED_MODULE__#__LOGIX_UNRESOLVED_EXPORT__'
const ARTIFACT_DIR_PLACEHOLDER = '__LOGIX_ARTIFACT_DIR__'

describe('logix-cli integration (legacy command migration)', () => {
  it('maps contract-suite.run to merged reason and ir.validate replacement command', async () => {
    const runId = 'command-merged-contract-1'
    const out = await Effect.runPromise(
      runCli(['contract-suite', 'run', '--runId', runId, '--entry', 'fixtures/contract.ts#ContractEntry']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.reasons[0]?.code).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.nextActions[0]).toMatchObject({
      id: 'run-ir-validate-contract-profile',
      action: 'command.run',
      args: {
        command: `logix ir validate --runId ${runId} --profile contract --in ${ARTIFACT_DIR_PLACEHOLDER}`,
      },
      ifReasonCodes: ['E_CLI_COMMAND_MERGED'],
    })
  })

  it('maps spy.evidence to merged reason and trialrun evidence replacement command', async () => {
    const runId = 'command-merged-spy-1'
    const entry = 'fixtures/spy.ts#SpyEntry'
    const out = await Effect.runPromise(runCli(['spy', 'evidence', '--runId', runId, '--entry', entry]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.reasons[0]?.code).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.nextActions[0]).toMatchObject({
      id: 'run-trialrun-evidence',
      action: 'command.run',
      args: {
        command: `logix trialrun --runId ${runId} --entry ${entry} --emit evidence`,
      },
      ifReasonCodes: ['E_CLI_COMMAND_MERGED'],
    })
  })

  it('maps anchor.index to merged reason and ir.export with unresolved entry placeholder', async () => {
    const runId = 'command-merged-anchor-1'
    const out = await Effect.runPromise(runCli(['anchor', 'index', '--runId', runId]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.reasons[0]?.code).toBe('E_CLI_COMMAND_MERGED')
    expect(out.result.nextActions[0]).toMatchObject({
      id: 'run-ir-export-with-anchors',
      action: 'command.run',
      args: {
        command: `logix ir export --runId ${runId} --entry ${UNRESOLVED_ENTRY_PLACEHOLDER} --with-anchors`,
      },
      ifReasonCodes: ['E_CLI_COMMAND_MERGED'],
    })
  })
})
