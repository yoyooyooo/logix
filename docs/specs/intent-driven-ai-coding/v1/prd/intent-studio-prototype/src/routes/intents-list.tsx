import { Link } from 'react-router-dom'
import { useIntentStore } from '../stores/use-intent-store'

export function IntentsList() {
  const intents = useIntentStore((state) => state.intents)
  return (
    <div className="workspace">
      <section className="card">
        <div className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Intents</div>
        <h2>意图资产库</h2>
        <p className="panel-desc">列出所有意图草稿与发布状态，演示真实平台的路由入口。</p>
        <ul className="asset-list">
          {intents.map((intent) => (
            <li key={intent.id}>
              <Link to={`/intents/${intent.id}`}>{intent.title}</Link>
              <span>{intent.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
