interface Props {
  storyCode: string
  title: string
  stats?: { readonly total: number; readonly done: number; readonly todo: number }
  hint?: string | null
  tone?: 'default' | 'danger'
  onOpen: () => void
}

import { motion } from 'framer-motion'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

export function UserStoryCard({ storyCode, title, stats, hint, tone = 'default', onOpen }: Props) {
  const isDanger = tone === 'danger'
  const pillVariant = isDanger ? 'danger' : 'info'

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
      className="group relative block w-full outline-none bg-background transition-all duration-200 hover:bg-muted/30"
      onClick={onOpen}
      title={title}
    >
      <div className="flex min-w-0 items-start gap-3 p-3 border-l-4 border-transparent transition-all duration-200 group-hover:translate-x-1 group-hover:border-accent">
        <Badge variant={pillVariant} className="mt-0.5 shrink-0 font-mono">
          {storyCode}
        </Badge>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {stats ? (
              <span className="font-mono">
                {stats.done}/{stats.total}
              </span>
            ) : (
              <span>—</span>
            )}
            {hint ? <span className="truncate opacity-70 normal-case tracking-normal">{hint}</span> : null}
          </div>

          <div className="mt-1 min-w-0 break-words text-sm font-bold font-serif leading-relaxed text-foreground">
            {title}
          </div>

          {stats && stats.total > 0 ? (
            <div className="mt-2 flex h-1 w-24 gap-px overflow-hidden opacity-50">
              {/* Barcode effect: thin lines */}
              {[...Array(stats.total)].map((_, i) => (
                <div key={i} className={`h-full w-full flex-1 ${i < stats.done ? 'bg-foreground' : 'bg-border'}`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
  )
}
