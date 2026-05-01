import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { normalizeWorkbenchResizePatch, ResizableWorkbench } from './ResizableWorkbench.js'
import { defaultWorkbenchLayoutState } from './layoutState.js'

describe('ResizableWorkbench', () => {
  it('exposes stable workbench regions and layout sizing state', () => {
    render(
      <ResizableWorkbench
        layout={defaultWorkbenchLayoutState}
        commandBar={<div>commands</div>}
        filesPanel={<div>files</div>}
        sourceEditor={<div>source</div>}
        runtimeInspector={<div>inspector</div>}
        bottomDrawer={<div>bottom</div>}
      />,
    )

    expect(screen.getByTestId('resizable-workbench').getAttribute('data-files-collapsed')).toBe('false')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-bottom-collapsed')).toBe('false')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-files-width')).toBe('256')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-inspector-width')).toBe('340')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-bottom-height')).toBe('192')
    expect(screen.getByText('commands').closest('[data-playground-region="top-command-bar"]')).toBeTruthy()
    expect(screen.getByText('files').closest('[data-playground-region="files-panel"]')).toBeTruthy()
    expect(screen.getByText('source').closest('[data-playground-region="source-editor"]')).toBeTruthy()
    expect(screen.getByText('inspector').closest('[data-playground-region="runtime-inspector"]')).toBeTruthy()
    expect(screen.getByText('bottom').closest('[data-playground-region="bottom-evidence-drawer"]')).toBeTruthy()
  })

  it('exposes draggable handles for files, inspector and bottom drawer resizing', () => {
    render(
      <ResizableWorkbench
        layout={defaultWorkbenchLayoutState}
        commandBar={<div>commands</div>}
        filesPanel={<div>files</div>}
        sourceEditor={<div>source</div>}
        runtimeInspector={<div>inspector</div>}
        bottomDrawer={<div>bottom</div>}
      />,
    )

    expect(screen.getByRole('separator', { name: 'Resize files panel' })).toBeTruthy()
    expect(screen.getByRole('separator', { name: 'Resize runtime inspector' })).toBeTruthy()
    expect(screen.getByRole('separator', { name: 'Resize bottom drawer' })).toBeTruthy()
  })

  it('records region commits for render isolation probes', async () => {
    ;(window as typeof window & {
      __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: {
        commits: Record<string, number>
        mounts: Record<string, number>
      }
    }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ = { commits: {}, mounts: {} }

    render(
      <ResizableWorkbench
        layout={defaultWorkbenchLayoutState}
        commandBar={<div>commands</div>}
        filesPanel={<div>files</div>}
        sourceEditor={<div>source</div>}
        runtimeInspector={<div>inspector</div>}
        bottomDrawer={<div>bottom</div>}
      />,
    )

    await waitFor(() => {
      const probe = (window as typeof window & {
        __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: {
          commits: Record<string, number>
          mounts: Record<string, number>
        }
      }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__
      expect(probe?.commits['runtime-inspector']).toBeGreaterThan(0)
      expect(probe?.mounts['runtime-inspector']).toBeGreaterThan(0)
    })
  })

  it('normalizes panel resize measurements before reporting layout state changes', () => {
    expect(normalizeWorkbenchResizePatch({
      filesWidth: 272.6,
      inspectorWidth: 410.4,
      bottomHeight: 216.8,
    })).toEqual({
      filesWidth: 273,
      inspectorWidth: 410,
      bottomHeight: 217,
    })
    expect(normalizeWorkbenchResizePatch({
      filesWidth: 120,
      inspectorWidth: 900,
      bottomHeight: Number.NaN,
    })).toEqual({
      filesWidth: 160,
      inspectorWidth: 520,
    })
  })

  it('keeps the collapsed bottom drawer at tab bar height', () => {
    render(
      <ResizableWorkbench
        layout={{ ...defaultWorkbenchLayoutState, bottomCollapsed: true }}
        commandBar={<div>commands</div>}
        filesPanel={<div>files</div>}
        sourceEditor={<div>source</div>}
        runtimeInspector={<div>inspector</div>}
        bottomDrawer={<div>bottom</div>}
      />,
    )

    expect(screen.getByTestId('resizable-workbench').getAttribute('data-bottom-collapsed')).toBe('true')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-bottom-height')).toBe('192')
    expect(screen.getByTestId('resizable-workbench').getAttribute('data-bottom-visible-height')).toBe('36')
    expect(screen.getByText('bottom').closest('[data-playground-region="bottom-evidence-drawer"]')).toBeTruthy()
  })
})
