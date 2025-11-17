/*
[INPUT]
- copy: landingCopy[lang].features
[OUTPUT]
- 核心能力网格（只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/Features
*/

'use client'

import { motion } from 'framer-motion'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUp, stagger, viewportOnce } from '@/lib/motion'
import type { FeaturesCopy } from './content'

export function FeaturesSection({ copy }: { copy: FeaturesCopy }) {
  return (
    <section aria-labelledby="landing-features-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <div className="max-w-3xl">
        <h2 id="landing-features-title" className="text-2xl sm:text-3xl font-bold tracking-tight">
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
          <motion.div key={item.title} variants={fadeUp}>
            <Card className="h-full">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border bg-muted/40 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary/80" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
