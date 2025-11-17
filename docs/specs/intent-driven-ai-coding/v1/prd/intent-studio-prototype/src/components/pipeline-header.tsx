export function PipelineHeader() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Intent-Driven Platform
        </div>
        <h1 style={{ margin: '6px 0 0' }}>Intent → Pattern → Plan → Flow</h1>
        <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
          结构化意图，驱动模式库、生成 Plan 与运行时 Flow 的全链路 IDE。
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
          Prototype · React + Vite
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          数据全部来自 docs/specs/intent-driven-ai-coding/v1
        </div>
      </div>
    </header>
  )
}
