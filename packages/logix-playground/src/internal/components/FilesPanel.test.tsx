import { fireEvent, render, screen, within } from '@testing-library/react'
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
  it('groups service source files while preserving normal source selection', () => {
    const workspace = createPlaygroundWorkspace(serviceProject)
    const selected: string[] = []

    render(
      <FilesPanel
        workspace={workspace}
        activeFilePath="/src/main.program.ts"
        onSelectFile={(path) => selected.push(path)}
      />,
    )

    const serviceGroup = screen.getByRole('group', { name: 'Search client' })
    expect(within(serviceGroup).getByRole('button', { name: '/src/services/search.service.ts' })).toBeTruthy()

    fireEvent.click(within(serviceGroup).getByRole('button', { name: '/src/services/search.service.ts' }))

    expect(selected).toEqual(['/src/services/search.service.ts'])
  })
})
