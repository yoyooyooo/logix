import { flowSources } from '../data'
import { useIntentStore } from '../stores/use-intent-store'

export function FlowViewer() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  const flow = intent?.runtimeFlows?.[0]
  if (!flow) return null
  const code = flowSources[flow.id]

  return (
    <div className="card flow-card">
      <h3>Flow → Effect → Hook</h3>
      <div className="split-panel">
        <div>
          <div className="section-label">Flow Pipeline</div>
          <div className="flow-steps">
            {flow.pipeline.map((step, idx) => (
              <div key={idx} className="flow-step">
                <strong>{step.call}</strong>
                {step.as ? <span> → {step.as}</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-label">.flow.ts (Effect)</div>
          <pre className="code-block" style={{ background: 'rgba(15,23,42,0.85)', color: '#e5e7eb' }}>
            {code}
          </pre>
        </div>
      </div>
    </div>
  )
}
