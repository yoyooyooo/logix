interface Props {
  value: 'task' | 'us'
  onChange: (next: 'task' | 'us') => void
  size?: 'sm' | 'md'
}

import { useId } from 'react'

export function ViewModeTabs({ value, onChange, size = 'md' }: Props) {
  // Simple controlled component, no internal state needed for this strict style

  const height = size === 'sm' ? 'h-6' : 'h-8'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div
      role="tablist"
      aria-label="View Mode"
      className="inline-flex items-center border border-border divide-x divide-border bg-background"
    >
      {(['us', 'task'] as const).map((mode) => {
        const isActive = value === mode
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(mode)}
            className={`
              ${height} px-3 min-w-[60px]
              flex items-center justify-center
              font-mono uppercase tracking-widest ${textSize}
              transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50
              ${isActive ? 'bg-foreground text-background font-bold' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}
          >
            {mode}
          </button>
        )
      })}
    </div>
  )
}
