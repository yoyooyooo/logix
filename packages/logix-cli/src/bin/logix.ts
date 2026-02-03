#!/usr/bin/env node
import process from 'node:process'

import { Effect } from 'effect'

import { formatCommandResult, main } from '../Commands.js'
import { asSerializableErrorSummary } from '../internal/errors.js'
import { makeErrorCommandResult } from '../internal/result.js'

const writeStdout = (text: string): void => {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
}

Effect.runPromise(main(process.argv.slice(2)))
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
    const result = makeErrorCommandResult({
      runId: 'missing-runId',
      command: 'unknown',
      error: asSerializableErrorSummary(cause),
    })
    writeStdout(formatCommandResult(result))
    process.exitCode = 1
  })

