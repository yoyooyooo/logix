import { patterns } from '../data'
import type { IntentPatternConfig } from '../types'
import { useIntentStore } from '../stores/use-intent-store'

export function PatternManager() {
  const intent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  const updateIntent = useIntentStore((state) => state.updateIntent)
  const selectedIntentId = useIntentStore((state) => state.selectedIntentId)

  if (!intent) {
    return (
      <div className="card">
        <h4>模式选择</h4>
        <div className="empty-state">请先粘贴需求并解析出意图。</div>
      </div>
    )
  }

  const applied = new Set(intent.patterns.map((p) => p.id))

  const togglePattern = (patternId: string) => {
    const next: IntentPatternConfig[] = applied.has(patternId)
      ? intent.patterns.filter((p) => p.id !== patternId)
      : [...intent.patterns, { id: patternId, config: {}, target: 'auto' }]
    updateIntent(selectedIntentId, { patterns: next })
  }

  return (
    <div className="card">
      <h4>模式选择 / 绑定</h4>
      <p className="panel-desc">从平台模式库中挑选或移除当前意图的模式，演示“用户自主选择”的能力。</p>
      <div className="asset-list" style={{ maxHeight: 320, overflow: 'auto' }}>
        {patterns.map((pattern) => (
          <div key={pattern.id} className="pattern-card" style={{ borderColor: applied.has(pattern.id) ? 'var(--accent)' : 'var(--border)' }}>
            <header>
              <div>
                <strong>{pattern.name}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pattern.summary}</div>
              </div>
              <button
                className={applied.has(pattern.id) ? 'secondary-button' : 'primary-button'}
                onClick={() => togglePattern(pattern.id)}
              >
                {applied.has(pattern.id) ? '移除' : '应用'}
              </button>
            </header>
          </div>
        ))}
      </div>
      <div className="badge" style={{ marginTop: 10 }}>
        已应用：{applied.size} / {patterns.length}
      </div>
    </div>
  )
}
