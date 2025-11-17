interface Props {
  value: 'task' | 'us'
  onChange: (next: 'task' | 'us') => void
  size?: 'sm' | 'md'
}

import { useRef, useEffect, useId } from 'react'
import { motion } from 'framer-motion'

export function ViewModeTabs({ value, onChange, size = 'md' }: Props) {
  const id = useId()
  // Track the last value to determine if we are "switching".
  // If value is same as last render, it means we are just re-rendering (e.g. parent layout shift),
  // so we want INSTANT snapping (duration: 0) to avoid "floating pill" lag.
  // We init with `value` so that Mount is also instant.
  const lastValue = useRef(value)
  const shouldAnimate = value !== lastValue.current

  useEffect(() => {
    lastValue.current = value
  }, [value])

  const container = size === 'sm' ? 'rounded-lg p-1 gap-1' : 'rounded-xl p-1.5 gap-1.5'
  const button = size === 'sm' ? 'px-3 py-1 text-[12px]' : 'px-4 py-1.5 text-sm'
  const radius = size === 'sm' ? 'rounded-md' : 'rounded-lg'

  return (
    <div
      className={`inline-flex items-center bg-[var(--surface-float)] backdrop-blur shadow-sm border border-[var(--border-subtle)] ${container}`}
    >
      {(['us', 'task'] as const).map((mode) => {
        const isActive = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`${button} ${radius} relative font-medium transition-colors duration-200 ${
              isActive ? 'text-[var(--surface-base)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={`active-tab-pill-${id}`}
                className={`absolute inset-0 bg-[var(--intent-primary-fg)] shadow-sm ${radius}`}
                initial={false}
                animate={{ opacity: 1 }}
                transition={shouldAnimate ? { type: 'spring', stiffness: 300, damping: 25 } : { duration: 0 }}
              />
            )}
            <span className="relative z-10 uppercase tracking-wide">{mode}</span>
          </button>
        )
      })}
    </div>
  )
}
