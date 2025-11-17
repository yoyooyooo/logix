import { useIntentStore } from '../stores/use-intent-store'

export function IntentSelector() {
  const { intents, selectedIntentId, selectIntent } = useIntentStore()
  return (
    <div className="sidebar">
      <h1>Intent Catalog</h1>
      <div className="intent-list">
        {intents.map((intent) => (
          <button
            key={intent.id}
            className={intent.id === selectedIntentId ? 'active' : ''}
            onClick={() => selectIntent(intent.id)}
          >
            <div style={{ fontWeight: 700 }}>{intent.title}</div>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>{intent.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
