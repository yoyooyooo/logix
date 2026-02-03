import process from 'node:process'

import { Effect } from 'effect'

import { formatCommandResult, main } from '@logixjs/cli/Commands'

const writeStdout = (text: string): void => {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
}

const prefixContractSuiteRun = (argv: ReadonlyArray<string>): ReadonlyArray<string> => {
  const hasHelp = argv.includes('-h') || argv.includes('--help') || argv.length === 0
  if (hasHelp) return argv
  return ['contract-suite', 'run', ...argv]
}

Effect.runPromise(main(prefixContractSuiteRun(process.argv.slice(2))))
  .then((outcome) => {
    if (outcome.kind === 'help') {
      writeStdout(outcome.text)
      process.exitCode = outcome.exitCode
      return
    }

    writeStdout(formatCommandResult(outcome.result))
    process.exitCode = outcome.exitCode
  })
  .catch((cause) => {
    const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : 'Unknown error'
    writeStdout(
      JSON.stringify({
        schemaVersion: 1,
        kind: 'CommandResult',
        runId: 'missing-runId',
        command: 'contract-suite.run',
        ok: false,
        artifacts: [],
        error: { message, code: 'CLI_INTERNAL' },
      }),
    )
    process.exitCode = 1
  })
