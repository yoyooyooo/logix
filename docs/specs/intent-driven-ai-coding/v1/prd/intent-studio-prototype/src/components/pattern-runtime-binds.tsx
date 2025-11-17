import { usePatternStore } from '../stores/use-pattern-store'

interface Props {
  patternId: string
  runtimeBindings?: Record<string, { component?: string; service?: string }>
}

export function PatternRuntimeBinds({ patternId, runtimeBindings = {} }: Props) {
  const updateDraft = usePatternStore((state) => state.updateDraft)
  const entries = Object.entries(runtimeBindings) as [string, { component?: string; service?: string }][]

  const updateEntries = (
    next: Array<[string, { component?: string; service?: string }]>
  ) => {
    updateDraft(patternId, {
      runtimeBindings: Object.fromEntries(next),
    })
  }

  const handleChange = (
    index: number,
    field: keyof { component?: string; service?: string },
    value: string
  ) => {
    const next = entries.map(([key, entry], idx) =>
      idx === index
        ? [key, { ...entry, [field]: value }]
        : [key, entry]
    ) as [string, { component?: string; service?: string }][]
    updateEntries(next)
  }

  const handleKeyChange = (index: number, value: string) => {
    const next = entries.map(([key, entry], idx) =>
      idx === index ? [value, entry] : [key, entry]
    ) as [string, { component?: string; service?: string }][]
    updateEntries(next)
  }

  const addEntry = () => {
    updateEntries([...entries, [`slot_${entries.length + 1}`, { component: '', service: '' }]])
  }

  const removeEntry = (index: number) => updateEntries(entries.filter((_, idx) => idx !== index))

  return (
    <div>
      {entries.map(([key, entry], index) => (
        <div key={key} className="pattern-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>绑定 Key</label>
              <input value={key} onChange={(event) => handleKeyChange(index, event.target.value)} />
            </div>
            <div className="field">
              <label>组件 (import)</label>
              <input value={entry.component ?? ''} onChange={(event) => handleChange(index, 'component', event.target.value)} />
            </div>
            <div className="field">
              <label>Service 提供者</label>
              <input value={entry.service ?? ''} onChange={(event) => handleChange(index, 'service', event.target.value)} />
            </div>
          </div>
          <div className="actions-row" style={{ marginTop: 8 }}>
            <button className="secondary-button" type="button" onClick={() => removeEntry(index)}>
              删除绑定
            </button>
          </div>
        </div>
      ))}
      <button className="primary-button" type="button" onClick={addEntry}>
        添加 runtime 绑定
      </button>
    </div>
  )
}
