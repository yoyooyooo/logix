import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { definePlaygroundProject } from '../../Project.js'
import { createPlaygroundWorkspace } from '../session/workspace.js'
import { localCounterProjectFixture } from '../../../test/support/projectFixtures.js'
import { SourcePanel } from './SourcePanel.js'

describe('SourcePanel', () => {
  it('uses the package-owned Monaco adapter on the normal source editing path', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const edits: Array<{ readonly path: string; readonly content: string }> = []

    render(
      <SourcePanel
        workspace={workspace}
        activeFilePath="/src/main.program.ts"
        onEdit={(path, content) => edits.push({ path, content })}
        preferMonaco={false}
      />,
    )

    expect(screen.getByTestId('monaco-source-editor')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Source editor'), {
      target: { value: 'export const Program = {}' },
    })

    expect(edits).toEqual([{ path: '/src/main.program.ts', content: 'export const Program = {}' }])
  })

  it('formats the active source file before emitting an edit', async () => {
    const workspace = createPlaygroundWorkspace(
      definePlaygroundProject({
        id: 'source-formatting',
        files: {
          '/src/main.program.ts': {
            language: 'ts',
            content: 'export   const value={foo:"bar"}',
            editable: true,
          },
        },
        program: { entry: '/src/main.program.ts' },
      }),
    )
    const edits: Array<{ readonly path: string; readonly content: string }> = []

    render(
      <SourcePanel
        workspace={workspace}
        activeFilePath="/src/main.program.ts"
        onEdit={(path, content) => edits.push({ path, content })}
        preferMonaco={false}
      />,
    )

    fireEvent.click(screen.getByLabelText('Format source'))

    await waitFor(() => {
      expect(edits).toEqual([{ path: '/src/main.program.ts', content: "export const value = { foo: 'bar' }\n" }])
    })
  })
})
