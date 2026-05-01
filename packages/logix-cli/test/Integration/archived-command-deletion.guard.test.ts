import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))

const readAllSrc = (dir: string): string => {
  const abs = path.join(packageRoot, dir)
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .flatMap((entry) => {
      const next = path.join(dir, entry.name)
      if (entry.isDirectory()) return [readAllSrc(next)]
      if (!entry.name.endsWith('.ts')) return []
      return [fs.readFileSync(path.join(packageRoot, next), 'utf8')]
    })
    .join('\n')
}

describe('archived CLI command deletion', () => {
  it('rejects every archived command as invalid command input', async () => {
    const commands: ReadonlyArray<ReadonlyArray<string>> = [
      ['describe', '--runId', 'archived'],
      ['describe', '--runId', 'archived', '--json'],
      ['ir', 'export', '--runId', 'archived'],
      ['ir', 'validate', '--runId', 'archived'],
      ['ir', 'diff', '--runId', 'archived'],
      ['contract-suite', 'run', '--runId', 'archived'],
      ['transform', 'module', '--runId', 'archived'],
      ['trialrun', '--runId', 'archived'],
    ]

    for (const argv of commands) {
      const out = await Effect.runPromise(runCli(argv))
      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(2)
      expect(out.result.ok).toBe(false)
      expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
    }
  })

  it('has no archived command identity in parser, entry, or command files', () => {
    const source = readAllSrc('src')

    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/describe.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/contractSuiteRun.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/transformModule.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/bin/logix-devserver.ts'))).toBe(false)
    expect(source).not.toMatch(/CliDescribeReport|--describe-json|CommandResult\.mode/)
    expect(source).not.toMatch(/contract-suite\.run|transform\.module|ir\.export|ir\.validate|ir\.diff/)
    expect(source).not.toMatch(/archivedCommandTokenShapes|findArchivedCommandTokens/)
    expect(source).not.toMatch(/runDescribe|runContractSuiteRun|runTransformModule/)
    expect(source).not.toMatch(/logix-devserver/)
  })
})
