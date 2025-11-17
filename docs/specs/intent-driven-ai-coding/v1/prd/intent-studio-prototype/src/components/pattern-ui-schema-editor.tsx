import { usePatternStore } from '../stores/use-pattern-store'

type UiSchemaEntry = {
  widget?: string
  label?: string
  options?: string
}

interface Props {
  patternId: string
  uiSchema?: Record<string, UiSchemaEntry>
}

export function PatternUiSchemaEditor({ patternId, uiSchema = {} }: Props) {
  const updateDraft = usePatternStore((state) => state.updateDraft)
  const entries = Object.entries(uiSchema) as [string, UiSchemaEntry][]

  const updateEntries = (next: [string, UiSchemaEntry][]) => {
    updateDraft(patternId, {
      uiSchema: Object.fromEntries(next),
    })
  }

  const handleChange = (index: number, field: keyof UiSchemaEntry, value: string) => {
    const next = entries.map(([key, schema], idx) =>
      idx === index
        ? [key, { ...schema, [field]: value }]
        : [key, schema]
    ) as [string, UiSchemaEntry][]
    updateEntries(next)
  }

  const handleKeyChange = (index: number, value: string) => {
    const next = entries.map(([key, schema], idx) =>
      idx === index
        ? [value, schema]
        : [key, schema]
    ) as [string, UiSchemaEntry][]
    updateEntries(next)
  }

  const addField = () => {
    updateEntries([...entries, [`field_${entries.length + 1}`, { widget: 'input', label: '' }]])
  }

  const removeField = (index: number) => updateEntries(entries.filter((_, idx) => idx !== index))

  return (
    <div>
      {entries.map(([key, schema], index) => (
        <div key={key} className="pattern-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>字段 Key</label>
              <input value={key} onChange={(event) => handleKeyChange(index, event.target.value)} />
            </div>
            <div className="field">
              <label>Widget</label>
              <select value={schema.widget} onChange={(event) => handleChange(index, 'widget', event.target.value)}>
                <option value="input">input</option>
                <option value="select">select</option>
                <option value="checkbox">checkbox</option>
                <option value="column-picker">column-picker</option>
              </select>
            </div>
            <div className="field">
              <label>Label</label>
              <input value={schema.label ?? ''} onChange={(event) => handleChange(index, 'label', event.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Options / 描述</label>
            <textarea
              rows={2}
              placeholder="例如: options=order.fields"
              value={schema.options ?? ''}
              onChange={(event) => handleChange(index, 'options', event.target.value)}
            />
          </div>
          <div className="actions-row" style={{ marginTop: 8 }}>
            <button className="secondary-button" type="button" onClick={() => removeField(index)}>
              删除 UI 配置
            </button>
          </div>
        </div>
      ))}
      <button className="primary-button" type="button" onClick={addField}>
        添加 UI 配置
      </button>
    </div>
  )
}
