import { useParams } from 'react-router-dom'
import { useIntentStore } from '../stores/use-intent-store'
import { PlanSimulationProvider } from '../contexts/plan-simulation-context'
import { CopilotBar } from '../components/copilot-bar'
import { RolePanels } from '../components/role-panels'
import { ResultsDock } from '../components/results-dock'
import { PlatformAssets } from '../components/platform-assets'

export function IntentPage() {
  const { intentId } = useParams()
  const selectIntent = useIntentStore((state) => state.selectIntent)
  const intent = useIntentStore((state) =>
    intentId ? state.drafts[intentId] : undefined
  )

  if (!intentId) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">请选择一个意图。</div>
        </section>
      </div>
    )
  }

  if (!intent) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">未找到意图 {intentId}。</div>
        </section>
      </div>
    )
  }

  selectIntent(intentId)

  return (
    <PlanSimulationProvider intent={intent}>
      <div className="workspace">
        <CopilotBar />
        <RolePanels />
        <PlatformAssets />
        <ResultsDock />
      </div>
    </PlanSimulationProvider>
  )
}
