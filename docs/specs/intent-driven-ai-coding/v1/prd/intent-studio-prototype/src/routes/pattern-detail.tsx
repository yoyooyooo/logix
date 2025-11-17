import { useParams } from 'react-router-dom'
import { patternsById } from '../data'

export function PatternDetail() {
  const { patternId } = useParams()
  const pattern = patternId ? patternsById[patternId] : undefined
  if (!pattern) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">未找到该模式。</div>
        </section>
      </div>
    )
  }
  return (
    <div className="workspace">
      <section className="card">
        <div className="badge" style={{ background: '#ecfccb', color: '#4d7c0f' }}>Pattern Detail</div>
        <h2>{pattern.name}</h2>
        <p className="panel-desc">这里展示模式角色、schema、UI 等详情，模拟真实路由。</p>
        <pre className="code-block">{JSON.stringify(pattern, null, 2)}</pre>
      </section>
    </div>
  )
}
