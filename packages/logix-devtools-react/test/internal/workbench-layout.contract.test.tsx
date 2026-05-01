// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionWorkbench } from '../../src/internal/ui/workbench/SessionWorkbench.js'
import { deriveWorkbenchHostViewModel, normalizeLiveSnapshot } from '../../src/internal/state/workbench/index.js'

describe('DVTools session workbench layout', () => {
  it('renders a selected session workbench with a scrollable body', () => {
    const workbench = deriveWorkbenchHostViewModel(
      normalizeLiveSnapshot({
        events: [
          {
            kind: 'diagnostic',
            label: 'diagnostic',
            runtimeLabel: 'app',
            moduleId: 'FormModule',
            instanceId: 'form-1',
            timestamp: 1,
            txnSeq: 1,
            opSeq: 1,
            eventSeq: 1,
            meta: { code: 'field_kernel::deps_mismatch', artifactKey: 'diagnostic-report' },
          },
        ],
        latestStates: new Map(),
        instances: new Map(),
      } as any),
    )

    render(
      <div style={{ height: 320 }}>
        <SessionWorkbench
          workbench={workbench}
          selectedSessionId={workbench.sessions[0]?.id}
          selectedFindingId={workbench.findings[0]?.id}
          selectedArtifactKey={workbench.findings[0]?.artifacts[0]?.artifactKey}
          onSelectFinding={() => undefined}
          onSelectArtifact={() => undefined}
          onSelectDrilldown={() => undefined}
        />
      </div>,
    )

    expect(screen.getByLabelText('SelectedSessionWorkbench')).not.toBeNull()
    expect(screen.getByLabelText('WorkbenchSessionSummary')).not.toBeNull()
  })
})
