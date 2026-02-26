#!/usr/bin/env node

import process from 'node:process'

import { stableStringifyJson } from '../internal/stableJson.js'

const printHelp = (): string => `logix-devserver

当前分支仅提供最小 CLI 能力；devserver 子命令暂未启用。
`

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  process.stdout.write(`${printHelp()}\n`)
  process.exitCode = 0
} else {
  process.stdout.write(
    `${stableStringifyJson({
      schemaVersion: 1,
      kind: 'DevServerUnavailable',
      ok: false,
      error: {
        code: 'CLI_NOT_IMPLEMENTED',
        message: '[Logix][CLI] devserver 在当前构建未启用',
      },
    })}\n`,
  )
  process.exitCode = 1
}
