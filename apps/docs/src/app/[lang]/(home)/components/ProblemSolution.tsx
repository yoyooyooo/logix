'use client'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

const COPY = {
  zh: {
    problem: {
      title: (
        <>
          代码只是<span className="text-red-600 dark:text-red-400">投影</span>，而非意图。
        </>
      ),
      description: '我们花费 80% 的时间将模糊的需求“翻译”成僵硬的代码，再用剩下的 20% 去修复翻译过程中产生的 Bug。',
      boxTitle: '翻译鸿沟',
      boxDesc: 'PM 讲的是故事，开发写的是语法。真相往往在 JIRA 评论、Slack 讨论和过期的 Wiki 中流失。',
    },
    solution: {
      title: (
        <>
          将意图<span className="text-cyan-600 dark:text-cyan-400">结晶</span>为结构。
        </>
      ),
      description: (
        <>
          Logix 不仅仅是一个框架，它是一个<strong>结晶器（Crystallizer）</strong>
          。它捕捉模糊的人类意图，将其硬化为确定性的逻辑流。
        </>
      ),
      boxTitle: '双重分辨率',
      pmView: 'PM 视角: 用户故事 & 线框图',
      devView: 'Dev 视角: Effect 逻辑 & 组件树',
    },
  },
  en: {
    problem: {
      title: (
        <>
          Code is the <span className="text-red-600 dark:text-red-400">projection</span>, not the intent.
        </>
      ),
      description:
        'We spend 80% of our time translating vague requirements into rigid code, and the other 20% fixing the bugs caused by that translation.',
      boxTitle: 'The Translation Gap',
      boxDesc:
        'PMs speak in stories. Developers write in syntax. The "Truth" is lost in JIRA tickets, Slack threads, and outdated wikis.',
    },
    solution: {
      title: (
        <>
          Crystallize intent into <span className="text-cyan-600 dark:text-cyan-400">structure</span>.
        </>
      ),
      description: (
        <>
          Logix isn't just a framework; it's a <strong>Crystallizer</strong>. It captures fuzzy human intent and hardens
          it into deterministic logic flows.
        </>
      ),
      boxTitle: 'Dual Resolution',
      pmView: 'PM View: User Stories & Wireframes',
      devView: 'Dev View: Effect Logic & Component Trees',
    },
  },
} as const

export function ProblemSolution() {
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang === 'en' ? 'en' : 'zh'
  const copy = lang === 'en' ? COPY.en : COPY.zh

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: The Problem */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-black dark:text-white mb-6">{copy.problem.title}</h2>
            <div className="space-y-6 text-gray-600 dark:text-neutral-400 text-lg leading-relaxed">
              <p>{copy.problem.description}</p>
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-950/10 dark:border-red-900/20 backdrop-blur-sm">
                <h3 className="text-red-700 dark:text-red-300 font-semibold mb-2">{copy.problem.boxTitle}</h3>
                <p className="text-sm text-red-600/80 dark:text-red-200/60">{copy.problem.boxDesc}</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: The Solution */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-black dark:text-white mb-6">{copy.solution.title}</h2>
            <div className="space-y-6 text-gray-600 dark:text-neutral-400 text-lg leading-relaxed">
              <p>{copy.solution.description}</p>

              <div className="p-6 rounded-2xl bg-cyan-50 border border-cyan-200 dark:bg-cyan-950/10 dark:border-cyan-900/20 backdrop-blur-sm">
                <h3 className="text-cyan-700 dark:text-cyan-300 font-semibold mb-2">{copy.solution.boxTitle}</h3>
                <ul className="text-sm text-cyan-600/80 dark:text-cyan-200/60 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                    <strong>{copy.solution.pmView}</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                    <strong>{copy.solution.devView}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
