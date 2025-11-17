import { FlowSimulator } from './flow-simulator'
import { FileTreePreview } from './file-tree-preview'
import { usePlanSimulationContext } from '../contexts/plan-simulation-context'
import { useSessionStore } from '../stores/use-session-store'

export function ResultsDock() {
  const { plan, logs } = usePlanSimulationContext()
  const ready = useSessionStore((state) => state.hasRequirementInput)
  if (!ready) {
    return (
      <section className="card">
        <h3>成果区 · 实时产出</h3>
        <div className="empty-state">等待解析意图后生成文件树与行为模拟。</div>
      </section>
    )
  }
  return (
    <section className="card">
      <h3>成果区 · 实时产出</h3>
      <p className="panel-desc">显示行为、虚拟文件树和 CLI 输出，给团队直观“做了什么”。</p>
      {!plan ? (
        <div className="empty-state">LLM 已解析意图，点击“解析”后自动生成 Plan 与 Flow。</div>
      ) : (
        <>
          <div className="panels-grid">
            <div className="card" style={{ background: '#0b1120', color: '#e2e8f0' }}>
              <h4 style={{ marginTop: 0 }}>Flow 模拟</h4>
              <FlowSimulator />
            </div>
            <div className="card">
              <h4 style={{ marginTop: 0 }}>虚拟文件树</h4>
              <FileTreePreview plan={plan} />
            </div>
          </div>
          <div className="console-window" style={{ marginTop: 16, background: '#111827' }}>
            <h4 style={{ marginTop: 0 }}>CLI / Plan 输出</h4>
            {logs.length === 0 ? <div style={{ color: '#94a3b8' }}>尚无日志</div> : null}
            {logs.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
