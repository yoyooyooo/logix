import { patterns, templates } from '../data'

export function PlatformAssets() {
  return (
    <section className="card">
      <div className="badge" style={{ background: '#fef9c3', color: '#a16207' }}>平台资产</div>
      <h3>模式 / 模板 / 计划基座</h3>
      <p className="panel-desc">展示平台已经收录的可复用资产，方便 LLM 与人工共同扩展。</p>
      <div className="assets-grid">
        <div>
          <div className="section-label">Patterns · {patterns.length}</div>
          <ul className="asset-list">
            {patterns.map((pattern) => (
              <li key={pattern.id}>
                <strong>{pattern.name}</strong>
                <span>{pattern.summary}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="section-label">Templates · {templates.length}</div>
          <ul className="asset-list">
            {templates.map((template) => (
              <li key={template.id}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
