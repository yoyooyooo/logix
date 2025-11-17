/*
[INPUT]
- lang: 'zh' | 'en'
[OUTPUT]
- docs 首页 Landing Sections（tokens + shadcn/ui）
[POS]
- apps/docs：/{lang}
*/

'use client'

import Link from 'next/link'
import { MotionConfig } from 'framer-motion'

import { Separator } from '@/components/ui/separator'
import { landingCopy, type LandingLang } from './content'
import { HeroSection } from './HeroSection'
import { WordmarkLabSection } from './WordmarkLabSection'
import { NextStepsSection } from './NextStepsSection'
import { TimeTravelSection } from './TimeTravelSection'
import { FeaturesSection } from './FeaturesSection'
import { FAQSection } from './FAQSection'
import { FinalCTASection } from './FinalCTASection'

function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/35" />
      <div className="absolute -top-72 sm:-top-80 left-1/2 h-[400px] sm:h-[460px] w-[760px] sm:w-[880px] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 opacity-35 dark:opacity-20" />
    </div>
  )
}

export function LandingPage({ lang }: { lang: LandingLang }) {
  const copy = lang === 'en' ? landingCopy.en : landingCopy.zh

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate overflow-hidden selection:bg-primary/20">
        <BackgroundDecor />

        <HeroSection lang={lang} copy={copy.hero} />
        <WordmarkLabSection lang={lang} copy={copy.wordmarkLab} />
        <NextStepsSection lang={lang} copy={copy.nextSteps} />
        <TimeTravelSection copy={copy.timeTravel} />
        <FeaturesSection copy={copy.features} />
        <FAQSection copy={copy.faq} />
        <FinalCTASection lang={lang} copy={copy.finalCta} />

        <footer className="mx-auto max-w-6xl px-4 pb-14">
          <Separator className="mb-8" />
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-foreground/80 font-semibold tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                {copy.footer.brand}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <Link
                href={copy.footer.sourceHref}
                className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                GitHub
              </Link>
            </div>
            <div>© {new Date().getFullYear()} Logix.</div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
