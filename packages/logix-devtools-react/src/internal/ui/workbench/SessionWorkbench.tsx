import React from 'react'
import type {
  WorkbenchDrilldownKind,
  WorkbenchFinding,
  WorkbenchHostViewModel,
  WorkbenchSession,
} from '../../state/workbench/index.js'
import type { GetProgramForModule } from '../shell/DevtoolsShell.js'
import { SessionSummary } from './SessionSummary.js'
import { FindingsList } from './FindingsList.js'
import { EvidenceGapList } from './EvidenceGapList.js'
import { DrilldownHost } from './DrilldownHost.js'

export interface SessionWorkbenchProps {
  readonly workbench: WorkbenchHostViewModel
  readonly selectedSessionId?: string
  readonly selectedFindingId?: string
  readonly selectedArtifactKey?: string
  readonly selectedDrilldownKind?: WorkbenchDrilldownKind
  readonly onSelectFinding: (findingId: string) => void
  readonly onSelectArtifact: (artifactKey: string) => void
  readonly onSelectDrilldown: (kind: WorkbenchDrilldownKind) => void
  readonly getProgramForModule?: GetProgramForModule
}

const findingsForSession = (
  findings: ReadonlyArray<WorkbenchFinding>,
  session: WorkbenchSession | undefined,
): ReadonlyArray<WorkbenchFinding> => {
  if (!session) return findings
  return findings.filter((finding) => finding.sessionId === session.id || finding.sessionId === undefined)
}

export const SessionWorkbench: React.FC<SessionWorkbenchProps> = ({
  workbench,
  selectedSessionId,
  selectedFindingId,
  selectedArtifactKey,
  selectedDrilldownKind,
  onSelectFinding,
  onSelectArtifact,
  onSelectDrilldown,
  getProgramForModule,
}) => {
  const session = workbench.sessions.find((item) => item.id === selectedSessionId)
  const findings = findingsForSession(workbench.findings, session)
  const gaps = session ? session.gaps : workbench.gaps
  const drilldownKinds: WorkbenchDrilldownKind[] = ['timeline', 'inspector', 'field-graph', 'converge', 'report', 'raw-json']
  const selectedKind = selectedDrilldownKind ?? workbench.defaultDrilldown.kind

  return (
    <div className="logix-devtools-workbench h-full min-h-0 flex flex-col" aria-label="SelectedSessionWorkbench">
      <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--dt-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--dt-text-muted)' }}>
              Selected Session
            </div>
            <div className="mt-1 font-mono text-xs truncate" style={{ color: 'var(--dt-text-primary)' }}>
              {session?.id ?? 'no-session'}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {drilldownKinds.map((kind) => {
              const active = selectedKind === kind
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onSelectDrilldown(kind)}
                  className="px-2 py-1 rounded-md border text-[10px]"
                  style={{
                    backgroundColor: active ? 'var(--dt-bg-active)' : 'var(--dt-bg-root)',
                    borderColor: active ? 'var(--dt-info-border)' : 'var(--dt-border)',
                    color: active ? 'var(--dt-info)' : 'var(--dt-text-secondary)',
                  }}
                >
                  {kind}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="logix-devtools-workbench-body flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,44%)] gap-4 min-h-full">
          <div className="min-w-0 flex flex-col gap-4">
            <SessionSummary session={session} />
            <FindingsList
              findings={findings}
              selectedFindingId={selectedFindingId}
              selectedArtifactKey={selectedArtifactKey}
              onSelectFinding={onSelectFinding}
              onSelectArtifact={onSelectArtifact}
            />
            <EvidenceGapList gaps={gaps} />
          </div>
          <div className="min-w-0 min-h-[360px]">
            <DrilldownHost
              drilldown={{
                kind: selectedKind,
                sessionId: selectedSessionId,
                findingId: selectedFindingId,
                artifactKey: selectedArtifactKey,
              }}
              getProgramForModule={getProgramForModule}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
