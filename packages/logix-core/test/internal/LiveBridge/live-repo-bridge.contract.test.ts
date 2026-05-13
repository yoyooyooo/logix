import { describe, expect, it } from 'vitest'

import { makeLiveAdapterOffer, makeLiveSelectionCoordinateHandoff } from '../../../src/internal/repoBridge/live.js'

describe('repo-internal live bridge handoff', () => {
  it('normalizes adapter offers without owning runtime identity', () => {
    expect(
      makeLiveAdapterOffer({
        attachmentId: ' local ',
        adapterKind: 'node-local',
        targets: [{ runtimeId: ' runtime-1 ', moduleId: ' module-1 ', instanceId: ' instance-1 ' }],
      }),
    ).toEqual({
      attachmentId: 'local',
      adapterKind: 'node-local',
      targets: [{ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' }],
    })
  })

  it('keeps selection handoff as target coordinate plus optional hints', () => {
    expect(
      makeLiveSelectionCoordinateHandoff({
        target: { runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' },
        selectionId: 'selection-1',
        artifactOutputKey: 'live-capture-1',
      }),
    ).toEqual({
      target: { runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' },
      selectionId: 'selection-1',
      artifactOutputKey: 'live-capture-1',
    })
  })
})
