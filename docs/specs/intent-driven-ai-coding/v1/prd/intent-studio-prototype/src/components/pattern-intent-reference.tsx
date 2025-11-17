import { useIntentStore } from '../stores/use-intent-store'

interface Props {
  patternId: string
}

export function PatternIntentReference({ patternId }: Props) {
  const intents = useIntentStore((state) => state.intents)
  const refs = intents.filter((intent) => intent.patterns.some((p) => p.id === patternId))

  if (!refs.length) {
    return <div className="empty-state">暂时没有意图引用该模式。</div>
  }

  return (
    <ul className="asset-list">
      {refs.map((intent) => (
        <li key={intent.id}>
          <strong>{intent.title}</strong>
          <span>描述: {intent.description}</span>
        </li>
      ))}
    </ul>
  )
}
