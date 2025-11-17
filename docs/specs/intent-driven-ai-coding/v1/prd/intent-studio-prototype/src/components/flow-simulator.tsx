import { useIntentStore } from '../stores/use-intent-store'
import { flowSources } from '../data'

export function FlowSimulator() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  const flow = intent?.runtimeFlows?.[0]
  if (!flow) return null
  const code = flowSources[flow.id]

  return (
    <div className="flow-viewer-grid">
      <div>
        <div className="section-label">Trigger → Pipeline</div>
        <div className="flow-steps">
          <div className="flow-step">
            <strong>Trigger</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {flow.trigger?.element} · {flow.trigger?.event}
            </div>
          </div>
          {flow.pipeline.map((step, index) => (
            <div key={index} className="flow-step">
              <strong>{step.call}</strong>
              {step.as ? <span> → {step.as}</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="section-label">Effect Runtime (.flow.ts)</div>
        <pre className="code-block" style={{ background: '#020617', color: '#cbd5f5', minHeight: 260 }}>
          {code}
        </pre>
      </div>
    </div>
  )
}
