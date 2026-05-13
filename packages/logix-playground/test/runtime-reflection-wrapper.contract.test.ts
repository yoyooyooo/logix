import { describe, expect, it } from 'vitest'
import { createRuntimeReflectionWrapperSource } from '../src/internal/runner/runtimeReflectionWrapper.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('runtime reflection wrapper', () => {
  it('extracts the full runtime reflection manifest from the current Program snapshot', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const source = createRuntimeReflectionWrapperSource(snapshot)

    expect(source).toContain('@logixjs/core/repo-internal/reflection-api')
    expect(source).toContain('extractRuntimeReflectionManifest(Program')
    expect(source).toContain('extractMinimumProgramActionManifest(Program')
    expect(source).toContain('programId: "logix-react.local-counter"')
    expect(source).toContain('revision: 0')
    expect(source).not.toContain('deriveFallbackActionManifestFromSnapshot')
  })
})
