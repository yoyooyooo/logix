import { describe, expect, it } from 'vitest'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('ProjectSnapshot law', () => {
  it('rebuilds one execution coordinate per revision', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture, { sessionSeed: 'test-seed' })
    const first = createProjectSnapshot(workspace)

    workspace.editFile('/src/logic/localCounter.logic.ts', 'export const delta = 2')
    const second = createProjectSnapshot(workspace)

    expect(first.revision).toBe(0)
    expect(second.revision).toBe(1)
    expect(second.projectId).toBe('logix-react.local-counter')
    expect(second.envSeed).toBe(first.envSeed)
    expect(second.files.get('/src/logic/localCounter.logic.ts')?.content).toContain('delta = 2')
  })

  it('includes execution inputs for Logic-first runtime operations', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture, { sessionSeed: 'test-seed' })
    const snapshot = createProjectSnapshot(workspace)

    expect(snapshot.files.size).toBe(2)
    expect(snapshot.generatedFiles.size).toBe(0)
    expect(snapshot.previewEntry).toBeUndefined()
    expect(snapshot.programEntry?.entry).toBe('/src/main.program.ts')
    expect(snapshot.dependencies['@logixjs/core']).toBe('workspace')
    expect(snapshot.fixtures).toEqual({ seed: 'fixture' })
    expect(snapshot.diagnostics).toEqual({ check: true, trialStartup: true })
    expect(snapshot.files.get('/src/main.program.ts')?.hash).toEqual(expect.any(String))
    expect(workspace.activeFile).toBe('/src/main.program.ts')
  })

  it('reset restores original content under a new revision', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    workspace.editFile('/src/logic/localCounter.logic.ts', 'export const delta = 2')
    workspace.resetFiles()

    const snapshot = createProjectSnapshot(workspace)

    expect(snapshot.revision).toBe(2)
    expect(snapshot.files.get('/src/logic/localCounter.logic.ts')?.content).toBe('export const counterStep = 1')
    expect(Array.from(workspace.dirtyFiles)).toEqual([])
  })
})
