import React from 'react'
import type { WorkbenchDrilldownSelector } from '../../state/workbench/index.js'
import type { GetProgramForModule } from '../shell/DevtoolsShell.js'
import { EffectOpTimelineView } from '../timeline/EffectOpTimelineView.js'
import { Inspector } from '../inspector/Inspector.js'

export interface DrilldownHostProps {
  readonly drilldown?: WorkbenchDrilldownSelector
  readonly getProgramForModule?: GetProgramForModule
}

export const DrilldownHost: React.FC<DrilldownHostProps> = ({ drilldown, getProgramForModule }) => {
  const kind = drilldown?.kind ?? 'timeline'

  return (
    <div className="h-full min-h-0 flex flex-col rounded-md border overflow-hidden" style={{ borderColor: 'var(--dt-border)' }}>
      {kind === 'inspector' || kind === 'field-graph' || kind === 'raw-json' ? (
        <Inspector getProgramForModule={getProgramForModule} compact />
      ) : (
        <EffectOpTimelineView compact initialView={kind === 'converge' ? 'converge' : 'events'} />
      )}
    </div>
  )
}
