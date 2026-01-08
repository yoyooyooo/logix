/*
[INPUT]
- lang: 'zh' | 'en'
- copy: landingCopy[lang].nextSteps
[OUTPUT]
- 三个文档入口卡片（只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/NextSteps
*/

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUp, stagger, viewportOnce } from '@/lib/motion'
import { withLocalePrefix } from '@/lib/localePath'
import type { LandingLang, NextStepsCopy } from './content'

export function NextStepsSection({ lang, copy }: { lang: LandingLang; copy: NextStepsCopy }) {
  const base = withLocalePrefix(lang, '/docs')
  const cta = lang === 'en' ? 'Open' : '打开'

  return (
    <section aria-labelledby="landing-next-steps-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <div className="max-w-3xl">
        <h2 id="landing-next-steps-title" className="text-2xl sm:text-3xl font-bold tracking-tight">
          {copy.title}
        </h2>
        <p className="mt-2 text-muted-foreground">{copy.description}</p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {copy.items.map((item) => (
          <motion.div key={item.href} variants={fadeUp}>
            <Card className="h-full">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border bg-muted/40 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-foreground/80" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Button asChild variant="secondary" className="rounded-full">
                  <Link href={`${base}${item.href}`}>{cta}</Link>
                </Button>
                <span className="text-xs text-muted-foreground">{`${base}${item.href}`}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
