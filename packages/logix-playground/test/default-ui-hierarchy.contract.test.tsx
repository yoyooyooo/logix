import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import { snapshotToSandpackFiles } from '../src/internal/adapters/sandpack.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('default Playground UI hierarchy', () => {
  it('keeps workbench editor, runtime result and actions primary', () => {
    render(<PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />)

    expect(screen.getByLabelText('Workbench command bar')).toBeTruthy()
    expect(within(screen.getByLabelText('Workbench command bar')).getByText('Logix Playground')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'File navigator' })).toBeTruthy()
    expect(screen.getByLabelText('Source editor')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Result' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Action workbench' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Actions' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Program result' })).toBeTruthy()
    const commandBar = screen.getByLabelText('Workbench command bar')
    expect(within(commandBar).getByRole('button', { name: 'Check' })).toBeTruthy()
    expect(within(commandBar).getByRole('button', { name: 'Trial' })).toBeTruthy()
    expect(within(commandBar).getByRole('button', { name: 'Reset' })).toBeTruthy()
    expect(within(commandBar).queryByRole('button', { name: 'Reload preview' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Workbench bottom console' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Check report' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Trial report' })).toBeNull()
  })

  it('keeps Sandpack projection optional for Logic-first snapshots', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const files = snapshotToSandpackFiles(snapshot)

    expect(files['/index.html']).toBeUndefined()
    expect(files['/src/App.tsx']).toBeUndefined()
    expect(files['/src/main.program.ts']).toMatchObject({ active: false, readOnly: false })
    expect(files['/src/main.tsx']).toBeUndefined()
  })
})
