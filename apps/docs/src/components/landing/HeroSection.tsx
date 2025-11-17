/*
[INPUT]
- lang: 'zh' | 'en'
- copy: landingCopy[lang].hero
[OUTPUT]
- 首屏价值主张 + CTA（无颜色硬编码；只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/Hero
*/

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, GitGraph, Sparkles, Terminal, TimerReset } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fadeUp, stagger, viewportOnce } from '@/lib/motion'
import type { HeroCopy, LandingLang } from './content'

export function HeroSection({ lang, copy }: { lang: LandingLang; copy: HeroCopy }) {
  const titleHead = copy.title.slice(0, -1)
  const titleTail = copy.title.slice(-1)

  return (
    <header className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20 pb-12">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
        <motion.div variants={fadeUp}>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
              {copy.badge}
            </span>
          </Badge>
        </motion.div>

        <motion.div variants={fadeUp} className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95]">
            <span className="text-foreground">{titleHead}</span>
            <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">{titleTail}</span>
          </h1>
          <p className="mt-5 text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{copy.slogan}</p>
        </motion.div>

        <motion.p variants={fadeUp} className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          {copy.description}
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start gap-3">
          <Button asChild size="lg" className="rounded-full group">
            <Link href={`/${lang}/docs`} className="gap-2">
              {copy.docsCta}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>

          <Button asChild size="lg" variant="outline" className="rounded-full">
            <a href="https://github.com/yoyooyooo/logix" target="_blank" rel="noreferrer" className="gap-2">
              <Terminal />
              {copy.sourceCta}
            </a>
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          viewport={viewportOnce}
          whileInView="show"
          initial="hidden"
          className="flex flex-wrap gap-2 pt-4"
        >
          {[
            { icon: Sparkles, label: 'Deterministic' },
            { icon: TimerReset, label: 'Replayable' },
            { icon: GitGraph, label: 'Minimal IR' },
          ].map((item) => (
            <Badge key={item.label} variant="outline" className="rounded-full px-3 py-1 text-xs">
              <span className="inline-flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {item.label}
              </span>
            </Badge>
          ))}
        </motion.div>
      </motion.div>
    </header>
  )
}
