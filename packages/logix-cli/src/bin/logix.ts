#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { Effect } from 'effect'

import { formatCliResult, main } from '../internal/entry.js'
import { asSerializableErrorSummary } from '../internal/errors.js'
import { runLiveDaemonRuntime } from '../internal/liveDaemonRuntime.js'
import { makeErrorCommandResult } from '../internal/result.js'

const writeStdout = (text: string): void => {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
}

process.env.LOGIX_INTERNAL_CLI_ENTRY ??= fileURLToPath(import.meta.url)
process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON ??= JSON.stringify(process.execArgv)

if (process.argv[2] === '__internal_live_daemon') {
  void runLiveDaemonRuntime().catch((cause) => {
    const result = makeErrorCommandResult({
      runId: 'missing-runId',
      command: 'live',
      error: asSerializableErrorSummary(cause),
    })
    writeStdout(formatCliResult(result))
    process.exitCode = 1
  })
} else
Effect.runPromise(main(process.argv.slice(2)))
  .then((outcome) => {
    if (outcome.kind === 'help') {
      writeStdout(outcome.text)
      process.exitCode = outcome.exitCode
      return
    }
    writeStdout(formatCliResult(outcome.result))
    process.exitCode = outcome.exitCode
  })
  .catch((cause) => {
    const result = makeErrorCommandResult({
      runId: 'missing-runId',
      command: 'unknown',
      error: asSerializableErrorSummary(cause),
    })
    writeStdout(formatCliResult(result))
    process.exitCode = 1
  })
