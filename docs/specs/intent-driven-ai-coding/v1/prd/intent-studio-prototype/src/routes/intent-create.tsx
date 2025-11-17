import { useIntentStore } from '../stores/use-intent-store'
import { PlanSimulationProvider } from '../contexts/plan-simulation-context'
import { RequirementIntake } from '../components/requirement-intake'
import { CopilotBar } from '../components/copilot-bar'
import { RolePanels } from '../components/role-panels'
import { ResultsDock } from '../components/results-dock'
import { PlatformAssets } from '../components/platform-assets'

export function IntentCreateRoute() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  return (
    <PlanSimulationProvider intent={intent}>
      <div className="workspace">
        <RequirementIntake />
        <CopilotBar />
        <RolePanels />
        <PlatformAssets />
        <ResultsDock />
      </div>
    </PlanSimulationProvider>
  )
}
