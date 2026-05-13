import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { definePlaygroundProject } from '../../Project.js'
import { createPlaygroundWorkspace } from '../session/workspace.js'
import { FilesPanel } from './FilesPanel.js'

const serviceProject = definePlaygroundProject({
  id: 'logix-react.service-navigation',
  files: {
    '/src/main.program.ts': {
      language: 'ts',
      content: 'export const Program = {}\nexport const main = () => undefined',
      editable: true,
    },
    '/src/services/search.service.ts': {
      language: 'ts',
      content: 'export const search = () => []',
      editable: true,
    },
  },
  program: { entry: '/src/main.program.ts' },
  serviceFiles: [
    {
      id: 'search-client',
      label: 'Search client',
      files: [{ path: '/src/services/search.service.ts', label: 'Search service', role: 'service-provider' }],
    },
  ],
})

describe('FilesPanel service file groups', () => {
  it('groups service source files while preserving normal source selection', async () => {
    const workspace = createPlaygroundWorkspace(serviceProject)
    const selected: string[] = []

    render(
      <FilesPanel
        workspace={workspace}
        activeFilePath="/src/main.program.ts"
        onSelectFile={(path) => selected.push(path)}
      />,
    )

    expect(document.querySelector('file-tree-container')).toBeTruthy()

    const tree = document.querySelector('file-tree-container')
    const serviceFileButton = await waitFor(() => {
      const button = tree?.shadowRoot?.querySelector<HTMLButtonElement>('[data-item-path="src/services/search.service.ts"]')
      expect(button).toBeTruthy()
      return button
    })

    fireEvent.click(serviceFileButton!)

    expect(selected).toEqual(['/src/services/search.service.ts'])
  })
})
