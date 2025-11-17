import { patterns } from '../data'
import { useIntentStore } from '../stores/use-intent-store'

export function PatternGallery() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  return (
    <div className="card">
      <h3>Pattern Library</h3>
      <div className="pattern-list">
        {patterns.map((pattern) => {
          const isUsed = intent?.patterns.some((p) => p.id === pattern.id)
          return (
            <div
              key={pattern.id}
              className="pattern-card"
              style={{
                borderColor: isUsed ? 'var(--accent)' : 'var(--border)',
                background: isUsed ? 'var(--accent-soft)' : '#fff',
              }}
            ><header>
                <div>
                  <strong>{pattern.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pattern.summary}</div>
                </div>
                <span className="badge">{pattern.status}</span>
              </header>
              <div className="section-label" style={{ marginTop: 12 }}>
                Roles
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {pattern.composition?.roles.map((role) => (
                  <li key={role.id} style={{ marginBottom: 4 }}>
                    <strong>{role.label}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      {role.requires?.map((req) => `requires ${req}`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
