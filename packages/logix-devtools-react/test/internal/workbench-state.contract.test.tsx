import { describe, expect, it } from 'vitest'
import { computeDevtoolsState } from '../../src/internal/state/compute.js'
import { emptyDevtoolsState } from '../../src/internal/state/model.js'

describe('DVTools workbench state', () => {
  it('uses workbench selections without default time travel state', () => {
    expect(emptyDevtoolsState).toMatchObject({
      open: false,
      selectedScopeId: undefined,
      selectedSessionId: undefined,
      selectedFindingId: undefined,
      selectedArtifactKey: undefined,
    })

    expect('timeTravel' in emptyDevtoolsState).toBe(false)
    expect(emptyDevtoolsState.settings).not.toHaveProperty('enableTimeTravelUI')
  })

  it('derives workbench from live snapshot and keeps UI selection as selection only', () => {
    const state = computeDevtoolsState(undefined, {
      events: [
        {
          kind: 'state',
          label: 'state:update',
          runtimeLabel: 'app',
          moduleId: 'FormModule',
          instanceId: 'form-1',
          timestamp: 1,
          txnSeq: 1,
          opSeq: 1,
          eventSeq: 1,
          meta: {},
        },
      ],
      latestStates: new Map(),
      instances: new Map(),
    } as any)

    expect(state.workbench.sessions).toHaveLength(1)
    expect(state.selectedSessionId).toBe(state.workbench.sessions[0]?.id)
    expect(state.workbench.projection.sessions).toHaveLength(1)
    expect(state.workbench.projection.sessions[0]).not.toHaveProperty('selectedSessionId')
    expect(state.workbench.projection.sessions[0]).not.toHaveProperty('selectedFindingId')
  })
})
