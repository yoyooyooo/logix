/*
[INPUT]
- lang: 'zh' | 'en'
- copy: landingCopy[lang].finalCta
[OUTPUT]
- 末尾收口 CTA（只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/FinalCTA
*/

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUp, viewportOnce } from '@/lib/motion'
import { withLocalePrefix } from '@/lib/localePath'
import type { FinalCtaCopy, LandingLang } from './content'

export function FinalCTASection({ lang, copy }: { lang: LandingLang; copy: FinalCtaCopy }) {
  return (
    <section aria-labelledby="landing-final-cta-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce}>
        <Card className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10" />
          <CardHeader className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {copy.badge}
              </Badge>
            </div>
            <CardTitle id="landing-final-cta-title" className="text-2xl sm:text-3xl tracking-tight">
              {copy.title}
            </CardTitle>
            <CardDescription className="max-w-2xl">{copy.description}</CardDescription>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href={withLocalePrefix(lang, '/docs')}>{copy.primaryCta}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href={withLocalePrefix(lang, '/docs/guide/get-started/quick-start')}>Quick Start</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    </section>
  )
}
