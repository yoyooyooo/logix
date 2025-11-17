import YAML from 'yaml'
import { usePlanSimulationContext } from '../contexts/plan-simulation-context'

export function PlanConsole() {
  const { plan, logs, generatePlan, executePlan, isGenerating, isExecuting } =
    usePlanSimulationContext()

  if (!plan && logs.length === 0) {
    return (
      <div className="card">
        <h2>Plan Console (Mock CLI)</h2>
        <div className="empty-state">等待解析后自动生成 Plan，或点击“Generate Plan”。</div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <button className="primary-button" onClick={generatePlan} disabled={isGenerating}>
            {isGenerating ? 'Synthesizing…' : 'Generate Plan'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Plan Console (Mock CLI)</h2>
      <div className="actions-row" style={{ marginBottom: 16 }}>
        <button
          className="primary-button"
          onClick={generatePlan}
          disabled={isGenerating}
        >
          {isGenerating ? 'Synthesizing…' : 'Generate Plan'}
        </button>
        <button
          className="secondary-button"
          onClick={executePlan}
          disabled={isExecuting}
        >
          {isExecuting ? 'Executing…' : 'Execute Plan (Mock)'}
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          模拟 CLI 行为：意图 → Plan → create-file 列表
        </span>
      </div>
      <div className="plan-console">
        <div className="console-window">
          <h4>Logs</h4>
          {logs?.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <div className="yaml-preview" style={{ height: 280 }}>
          <h4 style={{ marginTop: 0 }}>Plan JSON</h4>
          <pre>{plan ? YAML.stringify(plan) : '尚未生成 Plan'}</pre>
        </div>
      </div>
    </div>
  )
}
