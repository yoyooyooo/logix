interface Props {
  storyCode: string
  title: string
  stats?: { readonly total: number; readonly done: number; readonly todo: number }
  hint?: string | null
  tone?: 'default' | 'danger'
  onOpen: () => void
}

import { motion } from 'framer-motion'

export function UserStoryCard({ storyCode, title, stats, hint, tone = 'default', onOpen }: Props) {
  const isDanger = tone === 'danger'
  const pillClass = isDanger
    ? 'bg-[var(--intent-danger-bg)] text-[var(--intent-danger-fg)]'
    : 'bg-[var(--intent-info-bg)] text-[var(--intent-info-fg)]'

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="au-card au-clickable-no-scale group min-w-0 px-3 py-2.5 text-left"
      onClick={onOpen}
      title={title}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${pillClass}`}>
          {storyCode}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider opacity-80">
            {stats ? (
              <span>
                {stats.done}/{stats.total} DONE
              </span>
            ) : (
              <span>—</span>
            )}
            {hint ? <span className="truncate opacity-60 normal-case tracking-normal">{hint}</span> : null}
          </div>

          <div className="mt-1 min-w-0 break-words text-sm font-medium leading-relaxed text-[var(--text-primary)] group-hover:text-black">
            {title}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
