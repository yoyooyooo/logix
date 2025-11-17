import type { PatternSpec } from '../types'
import { usePatternStore } from '../stores/use-pattern-store'
interface Props {
  pattern: PatternSpec
}

export function PatternForm({ pattern }: Props) {
  const updateDraft = usePatternStore((state) => state.updateDraft)

  const handleChange = (field: keyof PatternSpec, value: string) => {
    updateDraft(pattern.id, { [field]: value } as Partial<PatternSpec>)
  }

  return (
    <div className="pattern-form">
      <div className="form-grid">
        <div className="field">
          <label>模式 ID</label>
          <input value={pattern.id} onChange={(event) => handleChange('id', event.target.value)} />
        </div>
        <div className="field">
          <label>名称</label>
          <input value={pattern.name} onChange={(event) => handleChange('name', event.target.value)} />
        </div>
        <div className="field">
          <label>版本</label>
          <input value={pattern.version} onChange={(event) => handleChange('version', event.target.value)} />
        </div>
        <div className="field">
          <label>状态</label>
          <select value={pattern.status} onChange={(event) => handleChange('status', event.target.value)}>
            <option value="draft">draft</option>
            <option value="review">review</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label>摘要</label>
        <textarea rows={3} value={pattern.summary} onChange={(event) => handleChange('summary', event.target.value)} />
      </div>

    </div>
  )
}
