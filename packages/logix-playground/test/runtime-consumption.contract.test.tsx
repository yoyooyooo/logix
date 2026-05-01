import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Playground runtime consumption boundary', () => {
  it('keeps fake local runners out of the production PlaygroundShell path', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/internal/components/PlaygroundShell.tsx'),
      'utf8',
    )

    expect(source).not.toContain('createDefaultProgramSessionRunner')
    expect(source).not.toContain('runLocalProgramSnapshot')
    expect(source).toContain('createProjectSnapshotRuntimeInvoker')
    expect(source).toContain('runtimeInvoker.dispatch')
  })
})
