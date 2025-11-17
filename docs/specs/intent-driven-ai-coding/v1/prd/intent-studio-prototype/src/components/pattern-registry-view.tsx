import { useParams } from 'react-router-dom'
import { PatternIntentReference } from './pattern-intent-reference'
import { usePatternStore } from '../stores/use-pattern-store'

export function PatternRegistryView() {
  const { patternId } = useParams()
  const patterns = usePatternStore((state) => state.patterns)
  const publish = usePatternStore((state) => state.publishPattern)
  const pattern = patterns.find((item) => item.id === patternId)

  if (!patternId || !pattern) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">未找到模式。</div>
        </section>
      </div>
    )
  }

  const handlePublish = () => publish(pattern.id)

  return (
    <div className="workspace">
      <section className="card">
        <div className="badge" style={{ background: '#fef9c3', color: '#a16207' }}>模式上架 / 关联</div>
        <h2>{pattern.name}</h2>
        <p className="panel-desc">查看并确认该模式的引用情况，执行发布或下线。</p>
        <div className="actions-row">
          <button className="primary-button" onClick={handlePublish}>
            发布模式
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <h4>引用此模式的意图</h4>
          <PatternIntentReference patternId={pattern.id} />
        </div>
        <div style={{ marginTop: 16 }}>
          <h4>模式摘要</h4>
          <pre className="code-block">{JSON.stringify(pattern, null, 2)}</pre>
        </div>
      </section>
    </div>
  )
}
