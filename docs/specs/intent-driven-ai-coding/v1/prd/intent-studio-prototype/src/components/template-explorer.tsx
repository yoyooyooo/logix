import { templates } from '../data'
import { useIntentStore } from '../stores/use-intent-store'

export function TemplateExplorer() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])

  return (
    <div className="card">
      <h3>Template Bindings</h3>
      {templates.map((template) => (
        <div key={template.id} className="pattern-card">
          <header>
            <strong>{template.name}</strong>
            <span className="badge">{template.version}</span>
          </header>
          <div className="section-label" style={{ marginTop: 12 }}>
            Pattern Roles
          </div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {template.patterns.map((binding) => (
              <li key={binding.patternId} style={{ marginBottom: 6 }}>
                <strong>{binding.patternId}</strong>
                <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>
                  {binding.implements.map((impl) => impl.role).join(', ')}
                </span>
              </li>
            ))}
          </ul>
          {intent?.patterns?.some((patternConfig) =>
            template.patterns.some((binding) => binding.patternId === patternConfig.id)
          ) ? (
            <div className="badge" style={{ background: '#dcfce7', color: '#166534', marginTop: 10 }}>
              Applied in current intent
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
