import { useParams } from 'react-router-dom'
import { PatternStudio } from '../components/pattern-studio'
import { usePatternStore } from '../stores/use-pattern-store'

export function PatternEditRoute() {
  const { patternId } = useParams()
  const select = usePatternStore((state) => state.selectPattern)

  if (!patternId) {
    return (
      <div className="workspace">
        <section className="card">
          <div className="empty-state">请选择模式。</div>
        </section>
      </div>
    )
  }

  select(patternId)

  return (
    <div className="workspace">
      <PatternStudio patternId={patternId} />
    </div>
  )
}
