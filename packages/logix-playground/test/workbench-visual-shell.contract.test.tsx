import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlaygroundPage } from '../src/Playground.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Playground visual shell', () => {
  it('renders the VS Code style playground surface from the current visual target', async () => {
    render(<PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />)

    const page = screen.getByTestId('playground-visual-shell')
    expect(page.className).toContain('bg-white')
    expect(page.className).toContain('text-gray-800')

    const commandBar = screen.getByLabelText('Workbench command bar')
    expect(commandBar.className).toContain('h-12')
    expect(commandBar.className).toContain('bg-white')
    await waitFor(() => {
      expect(within(commandBar).getByText('session ready')).toBeTruthy()
    })

    const filesPanel = screen.getByRole('navigation', { name: 'File navigator' })
    expect(filesPanel.className).toContain('bg-[#f8f9fa]')
    expect(within(filesPanel).getByText('Files')).toBeTruthy()

    const sourceRegion = screen.getByLabelText('Source editor').closest('[data-playground-region="source-editor"]')
    expect(sourceRegion?.textContent).toContain('TS')
    expect(sourceRegion?.className).toContain('bg-[#1e1e1e]')

    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })
    expect(bottom.className).toContain('bg-white')
    expect(within(bottom).getByRole('button', { name: 'Console' }).className).toContain('text-blue-600')

    const inspector = screen.getByRole('region', { name: 'Runtime inspector' })
    expect(inspector.className).toContain('bg-white')
    expect(within(inspector).queryByRole('button', { name: 'State' })).toBeNull()
    expect(within(inspector).getByRole('button', { name: 'Actions' }).className).toContain('text-blue-600')
    expect(within(inspector).getByPlaceholderText('search actions')).toBeTruthy()
  })
})
