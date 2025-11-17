import type { PatternRole } from '../types'
import { usePatternStore } from '../stores/use-pattern-store'

interface Props {
  patternId: string
  roles?: PatternRole[]
}

const emptyRole = (): PatternRole => ({
  id: `role-${Date.now()}`,
  label: '未命名角色',
  description: '',
  provides: undefined,
  requires: undefined,
})

export function PatternRolesEditor({ patternId, roles = [] }: Props) {
  const updateDraft = usePatternStore((state) => state.updateDraft)

  const updateRoles = (next: PatternRole[]) => {
    updateDraft(patternId, {
      composition: {
        roles: next,
      },
    })
  }

  const handleChange = (index: number, field: keyof PatternRole, value: string) => {
    const next = roles.map((role, idx) =>
      idx === index
        ? {
            ...role,
            [field]: value,
          }
        : role
    )
    updateRoles(next)
  }

  const handleCommaFields = (index: number, field: 'requires' | 'provides', value: string) => {
    const list = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const next = roles.map((role, idx) =>
      idx === index
        ? {
            ...role,
            [field]: list.length ? list : undefined,
          }
        : role
    )
    updateRoles(next)
  }

  const addRole = () => updateRoles([...roles, emptyRole()])

  const removeRole = (index: number) => updateRoles(roles.filter((_, idx) => idx !== index))

  if (!roles.length) {
    return (
      <div>
        <div className="empty-state">暂无角色，点击下方按钮添加。</div>
        <button className="primary-button" type="button" onClick={addRole}>
          添加角色
        </button>
      </div>
    )
  }

  return (
    <div>
      {roles.map((role, index) => (
        <div key={role.id} className="pattern-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>角色 ID</label>
              <input value={role.id} onChange={(event) => handleChange(index, 'id', event.target.value)} />
            </div>
            <div className="field">
              <label>显示名称</label>
              <input value={role.label} onChange={(event) => handleChange(index, 'label', event.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>描述</label>
            <textarea
              rows={2}
              value={role.description ?? ''}
              onChange={(event) => handleChange(index, 'description', event.target.value)}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>provides（逗号分隔）</label>
              <input
                value={Array.isArray(role.provides) ? role.provides.join(', ') : role.provides ?? ''}
                onChange={(event) => handleCommaFields(index, 'provides', event.target.value)}
              />
            </div>
            <div className="field">
              <label>requires（逗号分隔）</label>
              <input
                value={Array.isArray(role.requires) ? role.requires.join(', ') : ''}
                onChange={(event) => handleCommaFields(index, 'requires', event.target.value)}
              />
            </div>
          </div>
          <div className="actions-row" style={{ marginTop: 8 }}>
            <button className="secondary-button" type="button" onClick={() => removeRole(index)}>
              移除角色
            </button>
          </div>
        </div>
      ))}
      <button className="primary-button" type="button" onClick={addRole}>
        添加角色
      </button>
    </div>
  )
}
