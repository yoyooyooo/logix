import { usePatternStore } from '../stores/use-pattern-store'

interface ParamField {
  key: string
  type: string
  required?: boolean
  desc?: string
}

interface Props {
  patternId: string
  paramsSchema?: Record<string, { type?: string; required?: boolean; desc?: string }>
}

export function PatternParamsEditor({ patternId, paramsSchema = {} }: Props) {
  const updateDraft = usePatternStore((state) => state.updateDraft)
  const entries = Object.entries(paramsSchema) as [string, { type?: string; required?: boolean; desc?: string }][]

  type SchemaEntry = [string, { type?: string; required?: boolean; desc?: string }]

  const updateEntries = (next: SchemaEntry[]) => {
    updateDraft(patternId, {
      paramsSchema: Object.fromEntries(next),
    })
  }

  const handleChange = (index: number, field: keyof ParamField, value: string | boolean) => {
    const next = entries.map(([key, schema], idx) => {
      if (idx !== index) return [key, schema] as [string, { type?: string; required?: boolean; desc?: string }]
      if (field === 'key') {
        return [value as string, schema]
      }
      return [key, { ...schema, [field]: value }]
    }) as SchemaEntry[]
    updateEntries(next)
  }

  const addField = () => {
    updateEntries([...entries, [`field_${entries.length + 1}`, { type: 'string', required: false }]])
  }

  const removeField = (index: number) => updateEntries(entries.filter((_, idx) => idx !== index))

  if (!entries.length) {
    return (
      <div>
        <div className="empty-state">暂无参数定义。</div>
        <button className="primary-button" type="button" onClick={addField}>
          添加参数
        </button>
      </div>
    )
  }

  return (
    <div>
      {entries.map(([key, schema], index) => (
        <div key={key} className="pattern-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>字段 Key</label>
              <input value={key} onChange={(event) => handleChange(index, 'key', event.target.value)} />
            </div>
            <div className="field">
              <label>类型</label>
              <select value={schema.type} onChange={(event) => handleChange(index, 'type', event.target.value)}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="array">array</option>
                <option value="object">object</option>
              </select>
            </div>
            <div className="field">
              <label>是否必填</label>
              <input
                type="checkbox"
                checked={Boolean(schema.required)}
                onChange={(event) => handleChange(index, 'required', event.target.checked)}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>描述</label>
            <textarea
              rows={2}
              value={schema.desc ?? ''}
              onChange={(event) => handleChange(index, 'desc', event.target.value)}
            />
          </div>
          <div className="actions-row" style={{ marginTop: 8 }}>
            <button className="secondary-button" type="button" onClick={() => removeField(index)}>
              删除字段
            </button>
          </div>
        </div>
      ))}
      <button className="primary-button" type="button" onClick={addField}>
        添加参数
      </button>
    </div>
  )
}
