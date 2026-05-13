import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlaygroundPage } from '../src/Playground.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

interface RenderIsolationProbeStats {
  readonly commits: Record<string, number>
  readonly mounts: Record<string, number>
}

const resetRenderIsolationProbe = (): void => {
  window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ = { commits: {}, mounts: {} }
}

const readRenderIsolationProbe = (): RenderIsolationProbeStats =>
  window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ ?? { commits: {}, mounts: {} }

describe('Playground workbench layout', () => {
  it('exposes a top command bar slot for host project switchers', () => {
    render(
      <PlaygroundPage
        registry={[localCounterProjectFixture]}
        projectId="logix-react.local-counter"
        projectSwitcher={<button type="button">Switch fixture project</button>}
      />,
    )

    const commandBar = screen.getByLabelText('Workbench command bar')
    expect(within(commandBar).getByRole('button', { name: 'Switch fixture project' })).toBeTruthy()
  })

  it('exposes the 17 SSoT workbench display shape', async () => {
    render(
      <ProgramSessionRunnerProvider runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />
      </ProgramSessionRunnerProvider>,
    )

    const commandBar = screen.getByLabelText('Workbench command bar')
    expect(commandBar.closest('[data-playground-region="top-command-bar"]')).toBeTruthy()
    expect(within(commandBar).getByRole('button', { name: 'Run' })).toBeTruthy()
    expect(within(commandBar).getByRole('button', { name: 'Check' })).toBeTruthy()
    expect(within(commandBar).getByRole('button', { name: 'Trial' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'File navigator' }).closest('[data-playground-region="files-panel"]')).toBeTruthy()
    expect(screen.getByLabelText('Source editor').closest('[data-playground-region="source-editor"]')).toBeTruthy()
    const inspector = screen.getByRole('region', { name: 'Runtime inspector' })
    expect(inspector.closest('[data-playground-region="runtime-inspector"]')).toBeTruthy()
    expect(within(inspector).queryByRole('button', { name: 'State' })).toBeNull()
    expect(within(inspector).getByRole('button', { name: 'Actions' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).closest('[data-playground-region="bottom-evidence-drawer"]')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'State' }).getAttribute('data-playground-section')).toBe('state')
    expect(screen.getByRole('region', { name: 'Action workbench' }).getAttribute('data-playground-section')).toBe('actions')
    expect(screen.getByRole('region', { name: 'Program result' }).getAttribute('data-playground-section')).toBe('run-result')
    const actions = screen.getByRole('region', { name: 'Actions' })
    expect(actions).toBeTruthy()
    await waitFor(() => {
      expect(within(actions).getByText('increment')).toBeTruthy()
      expect(within(actions).getByText('decrement')).toBeTruthy()
      expect(within(actions).getByText('setCount')).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'Reload preview' })).toBeNull()

    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })
    for (const tab of ['Console', 'Trace', 'Snapshot']) {
      expect(within(bottom).getByRole('button', { name: tab }).getAttribute('data-playground-tab')).toBe(tab.toLowerCase())
    }
    fireEvent.click(within(bottom).getByRole('button', { name: 'Diagnostics' }))
    await waitFor(() => {
      expect(within(bottom).getByRole('region', { name: 'Diagnostics detail' }).getAttribute('data-playground-section')).toBe('diagnostics-summary')
    })
    fireEvent.click(within(bottom).getByRole('button', { name: 'Trace' }))
    await waitFor(() => {
      expect(within(bottom).getByLabelText('Trace detail').textContent).toContain('evidence-gap')
    })
    fireEvent.click(within(bottom).getByRole('button', { name: 'Snapshot' }))
    await waitFor(() => {
      expect(within(bottom).getByLabelText('Snapshot summary').textContent).toContain('logix-react.local-counter')
    })
  })

  it('keeps reset session render fanout inside command and evidence regions', async () => {
    render(
      <ProgramSessionRunnerProvider runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />
      </ProgramSessionRunnerProvider>,
    )

    const actions = screen.getByRole('region', { name: 'Actions' })
    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
      expect(within(actions).getByText('increment')).toBeTruthy()
    })

    resetRenderIsolationProbe()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s2').length).toBeGreaterThan(0)
    })

    const probe = readRenderIsolationProbe()
    expect(probe.commits['top-command-bar']).toBeGreaterThan(0)
    expect(probe.commits['runtime-inspector']).toBeGreaterThan(0)
    expect(probe.commits['bottom-evidence-drawer']).toBeGreaterThan(0)
    expect(probe.commits['files-panel'] ?? 0).toBe(0)
    expect(probe.commits['source-editor'] ?? 0).toBe(0)
    expect(probe.mounts['files-panel'] ?? 0).toBe(0)
    expect(probe.mounts['source-editor'] ?? 0).toBe(0)
  })
})
