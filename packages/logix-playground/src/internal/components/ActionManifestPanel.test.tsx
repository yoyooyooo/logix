import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActionManifestPanel } from './ActionManifestPanel.js'

describe('ActionManifestPanel', () => {
  it('shows unavailable state and runtime reflection evidence gaps from the action view model', () => {
    render(
      <ActionManifestPanel
        manifest={{
          projectId: 'fixture',
          revision: 1,
          authorityStatus: 'unavailable',
          evidenceGaps: [
            {
              kind: 'missing-action-manifest',
              source: 'runtime-reflection',
              message: 'Runtime reflection manifest is unavailable.',
            },
          ],
          actions: [],
        }}
      />,
    )

    expect(screen.getByRole('status').textContent).toContain('Runtime reflection manifest unavailable')
    expect(screen.getByText('runtime-reflection')).toBeTruthy()
    expect(screen.getByText('missing-action-manifest')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Dispatch increment' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy()
  })

  it('uses the shared editor adapter for JSON payload editing', () => {
    render(
      <ActionManifestPanel
        manifest={{
          projectId: 'fixture',
          revision: 1,
          authorityStatus: 'manifest',
          evidenceGaps: [],
          actions: [
            {
              actionTag: 'setCount',
              payloadKind: 'nonVoid',
              payloadSummary: 'Schema.Number',
              authority: 'manifest',
            },
          ],
        }}
        onDispatch={() => {}}
        editorPreferMonaco={false}
      />,
    )

    expect(screen.getByTestId('monaco-source-editor')).toBeTruthy()
    expect(screen.getByLabelText('Payload for setCount')).toBeTruthy()
  })
})
