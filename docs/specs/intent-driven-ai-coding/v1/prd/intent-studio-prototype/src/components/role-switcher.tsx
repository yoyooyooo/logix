const roles = [
  {
    id: 'product',
    label: '需求视图',
    description: '结构化意图、目标、场景',
  },
  {
    id: 'engineer',
    label: '工程视图',
    description: '模式/模版/Plan 资产',
  },
  {
    id: 'runtime',
    label: '运行时视图',
    description: 'Flow DSL 与 Effect 执行',
  },
]

interface Props {
  value: string
  onChange: (roleId: string) => void
}

export function RoleSwitcher({ value, onChange }: Props) {
  const handleSelect = (roleId: string) => {
    if (roleId === value) return
    onChange(roleId)
  }

  return (
    <div className="role-switcher">
      {roles.map((role) => (
        <button
          key={role.id}
          className={role.id === value ? 'active' : ''}
          onClick={() => handleSelect(role.id)}
        >
          <div style={{ fontWeight: 600 }}>{role.label}</div>
          <small>{role.description}</small>
        </button>
      ))}
    </div>
  )
}
