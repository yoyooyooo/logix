import { useParams } from 'react-router-dom'
import { useIntentStore } from '../stores/use-intent-store'
import { PipelineShell } from '../components/pipeline-shell'

export function IntentDetail() {
  const params = useParams()
  const selectIntent = useIntentStore((state) => state.selectIntent)
  const intent = useIntentStore((state) => state.drafts[params.intentId ?? ''])

  if (!intent) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">未找到该意图。</div>
        </section>
      </div>
    )
  }

  if (params.intentId) {
    selectIntent(params.intentId)
  }

  return <PipelineShell />
}
