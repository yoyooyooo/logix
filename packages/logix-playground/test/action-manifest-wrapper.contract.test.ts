import { describe, expect, it } from 'vitest'
import { createActionManifestWrapperSource } from '../src/internal/runner/actionManifestWrapper.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('action manifest wrapper', () => {
  it('generates a reflection-backed wrapper for the current Program snapshot', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const source = createActionManifestWrapperSource(snapshot)

    expect(source).toContain('@logixjs/core/repo-internal/reflection-api')
    expect(source).toContain('__LogixPlaygroundReflection.extractMinimumProgramActionManifest(Program')
    expect(source).toContain('programId: "logix-react.local-counter"')
    expect(source).toContain('export default')
    expect(source).toContain('increment: Schema.Void')
    expect(source).toContain('import { Effect as __LogixPlaygroundEffect } from "effect"')
  })
})
