import { useIntentStore } from '../stores/use-intent-store'
import { PipelineHeader } from './pipeline-header'
import { CopilotBar } from './copilot-bar'
import { RolePanels } from './role-panels'
import { ResultsDock } from './results-dock'
import { RequirementIntake } from './requirement-intake'
import { PlanSimulationProvider } from '../contexts/plan-simulation-context'
import { PlatformAssets } from './platform-assets'

export function PipelineShell() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])

  return (
    <PlanSimulationProvider intent={intent}>
      <main className="main">
        <PipelineHeader />
        <RequirementIntake />
        <CopilotBar />
        <RolePanels />
        <PlatformAssets />
        <ResultsDock />
      </main>
    </PlanSimulationProvider>
  )
}
