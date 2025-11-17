'use client'
import Link from 'next/link'
import { ArrowRight, Sparkles, Terminal } from 'lucide-react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { LogixTitle } from './LogixTitle'

const COPY = {
  zh: {
    badge: '公开预览',
    docsCta: '阅读文档',
    sourceCta: '查看源码',
    description: '用 React 心智模型组织规则与状态。确定性执行，运行过程可观测、可追踪、可回放。',
    slogan: (
      <>
        React 心智模型，确定性可观测运行时
      </>
    ),
  },
  en: {
    badge: 'Public Preview',
    docsCta: 'Read the Docs',
    sourceCta: 'View Source',
    description:
      'Use a React mental model for rules and state. Deterministic execution with observable, traceable, replayable runs.',
    slogan: (
      <>
        React mental model, a deterministic, observable runtime.
      </>
    ),
  },
} as const

export function Hero() {
  const params = useParams<{ lang?: string }>()
  const lang = typeof params?.lang === 'string' ? params.lang : 'zh'
  const copy = lang === 'en' ? COPY.en : COPY.zh

  return (
    <div className="flex flex-col items-start justify-center pt-20 pb-20 text-left px-4 sm:px-8 md:px-12 lg:px-20 relative z-10 w-full overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-gradient-to-b from-cyan-500/10 via-purple-500/10 to-transparent blur-3xl opacity-50 rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/50 dark:border-white/5 dark:bg-white/5 px-3 py-1 text-sm text-neutral-600 dark:text-neutral-400 backdrop-blur-md transition hover:bg-neutral-100 dark:hover:bg-white/10 mb-8"
      >
        <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
        <span>{copy.badge}</span>
      </motion.div>

      <div className="mb-8">
        <LogixTitle slogan={copy.slogan} />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="max-w-2xl text-lg sm:text-xl text-gray-600 dark:text-neutral-400 leading-relaxed font-light"
      >
        {copy.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.4 }}
        className="mt-10 flex flex-col sm:flex-row items-start gap-4"
      >
        <Link
          href={`/${lang}/docs`}
          className="group inline-flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white px-8 py-4 text-sm font-bold text-white dark:text-black transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-black shadow-lg hover:shadow-xl"
        >
          {copy.docsCta}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="https://github.com/yoyooyooo/logix"
          className="group inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/50 px-8 py-4 text-sm font-bold text-neutral-900 dark:text-white backdrop-blur-sm transition-all hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-800"
        >
          <Terminal className="mr-2 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          {copy.sourceCta}
        </Link>
      </motion.div>
    </div>
  )
}
