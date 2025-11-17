interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function PatternNavTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="tabs compact">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === active ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
