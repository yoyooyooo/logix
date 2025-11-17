import { PatternStudio } from '../components/pattern-studio'
import { usePatternStore } from '../stores/use-pattern-store'

export function PatternCreateRoute() {
  const createDraft = usePatternStore((state) => state.createDraft)
  const draft = createDraft()
  return (
    <div className="workspace">
      <PatternStudio patternId={draft.id} />
    </div>
  )
}
