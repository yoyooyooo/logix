import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { printHelp, runCli } from '../../src/Commands.js'
import { COMMAND_REGISTRY } from '../../src/internal/commandRegistry.js'

const EXPECTED_PRIMARY_COMMANDS = [
  'describe',
  'ir.export',
  'ir.validate',
  'ir.diff',
  'extension.validate',
  'extension.load',
  'extension.reload',
  'extension.status',
  'trialrun',
  'verify-loop',
  'next-actions.exec',
  'anchor.autofill',
  'transform.module',
] as const

const EXPECTED_MIGRATION_COMMANDS = ['contract-suite.run', 'spy.evidence', 'anchor.index'] as const

describe('contracts 103 command surface freeze', () => {
  it('keeps primary command surface stable and migration entries explicit', async () => {
    const primary = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'primary').map((entry) => entry.command)
    const migration = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'migration').map((entry) => entry.command)

    expect(primary).toEqual(EXPECTED_PRIMARY_COMMANDS)
    expect(migration).toEqual(EXPECTED_MIGRATION_COMMANDS)

    const out = await Effect.runPromise(runCli(['describe', '--runId', 'command-surface-freeze-1', '--json']))
    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const report = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')?.inline as any
    const describedCommands = (report?.commands ?? []).map((item: any) => item.name)
    const describedMigration = report?.migrationEntries?.map((item: any) => item.command) ?? []

    expect(describedCommands).toEqual(EXPECTED_PRIMARY_COMMANDS)
    expect(describedMigration).toEqual(EXPECTED_MIGRATION_COMMANDS)
  })

  it('prints primary commands in help section and keeps migration entries separated', () => {
    const help = printHelp()
    expect(help).toContain('迁移入口（兼容保留，不建议新调用）')

    const [primarySection = '', migrationAndTail = ''] = help.split('\n迁移入口（兼容保留，不建议新调用）:\n')
    const [migrationSection = ''] = migrationAndTail.split('\n\n全局参数:\n')

    const primaryUsage = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'primary').map((entry) => entry.usage)
    const migrationUsage = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'migration').map((entry) => entry.usage)

    for (const usage of primaryUsage) {
      expect(primarySection).toContain(usage)
      expect(migrationSection).not.toContain(usage)
    }

    for (const usage of migrationUsage) {
      expect(migrationSection).toContain(usage)
      expect(primarySection).not.toContain(usage)
    }
  })
})
