import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { loadProgramEntry } from '../../src/internal/programEntry.js'

const fixture = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const moduleOnlyFixture = path.resolve(__dirname, '../fixtures/BasicModuleOnly.ts')

describe('CLI Program entry authority', () => {
  it('loads a Program export', async () => {
    const program = await Effect.runPromise(loadProgramEntry({ modulePath: fixture, exportName: 'BasicProgram' }))
    expect((program as any)._kind).toBe('Program')
  })

  it('rejects Module and Logic exports', async () => {
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'ModuleOnly' }))).rejects.toMatchObject({
      code: 'CLI_ENTRY_NOT_PROGRAM',
    })
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'LogicOnly' }))).rejects.toMatchObject({
      code: 'CLI_ENTRY_NOT_PROGRAM',
    })
  })
})
