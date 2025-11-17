/*
[INPUT]
- copy: landingCopy[lang].timeTravel
[OUTPUT]
- Trace/回放能力示意（只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/TimeTravel
*/

'use client'

import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUp, stagger, viewportOnce } from '@/lib/motion'
import type { TimeTravelCopy } from './content'

export function TimeTravelSection({ copy }: { copy: TimeTravelCopy }) {
  const events = [
    { label: 'Init', tone: 'muted' as const },
    { label: 'Click', tone: 'primary' as const },
    { label: 'Validate', tone: 'secondary' as const },
    { label: 'API', tone: 'accent' as const },
    { label: 'Commit', tone: 'primary' as const },
    { label: 'Fork', tone: 'destructive' as const },
  ]

  const toneClass = (tone: (typeof events)[number]['tone']) => {
    switch (tone) {
      case 'primary':
        return 'bg-primary/35'
      case 'secondary':
        return 'bg-secondary/70'
      case 'accent':
        return 'bg-accent/70'
      case 'destructive':
        return 'bg-destructive/30'
      default:
        return 'bg-muted/60'
    }
  }

  return (
    <section aria-labelledby="landing-time-travel-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center"
      >
        <motion.div variants={fadeUp}>
          <h2 id="landing-time-travel-title" className="text-2xl sm:text-3xl font-bold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{copy.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className="rounded-full px-3 py-1" variant="secondary">
              {copy.highlight}
            </Badge>
            <Badge className="rounded-full px-3 py-1" variant="outline">
              stable instanceId / txnSeq / opSeq
            </Badge>
            <Badge className="rounded-full px-3 py-1" variant="outline">
              Slim + serializable
            </Badge>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{copy.mockTitle}</CardTitle>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  v3 sketch
                </Badge>
              </div>
              <CardDescription>{copy.mockHint}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-end gap-2 overflow-x-auto">
                  {events.map((e) => (
                    <div key={e.label} className="flex flex-col items-center gap-2 shrink-0">
                      <div
                        className={[
                          'h-9 w-10 rounded-xl border border-border/60 shadow-sm',
                          toneClass(e.tone),
                        ].join(' ')}
                      />
                      <span className="text-[11px] text-muted-foreground">{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-4">
                <div className="text-xs font-mono text-muted-foreground">{`> State Diff @ API`}</div>
                <div className="mt-2 space-y-1 text-xs font-mono">
                  <div className="text-muted-foreground">{`inventory: {`}</div>
                  <div className="pl-4 text-muted-foreground">{`status:`} <span className="text-foreground">{`'confirmed'`}</span></div>
                  <div className="pl-4 text-muted-foreground">{`available:`} <span className="text-foreground">{`42`}</span></div>
                  <div className="text-muted-foreground">{`}`}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  )
}
