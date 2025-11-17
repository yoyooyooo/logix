'use client'
import Link from 'next/link'
import { BookOpen, Brain, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

type Lang = 'zh' | 'en'

function getLang(input: unknown): Lang {
  return input === 'en' ? 'en' : 'zh'
}

function getCopy(lang: Lang) {
  const base = `/${lang}/docs`
  if (lang === 'en') {
    return {
      title: 'Start here',
      description: 'Three quick entries to build a working mental model.',
      items: [
        {
          icon: Rocket,
          title: 'Quick Start',
          desc: 'Build your first app with Modules, State, and Flows.',
          href: `${base}/guide/get-started/quick-start`,
        },
        {
          icon: Brain,
          title: 'Thinking in Logix',
          desc: 'Understand rules and state with a React mental model.',
          href: `${base}/guide/essentials/thinking-in-logix`,
        },
        {
          icon: BookOpen,
          title: 'API Reference',
          desc: '@logix/core and @logix/react.',
          href: `${base}/api`,
        },
      ],
    } as const
  }

  return {
    title: '从这里开始',
    description: '三个入口：快速开始、核心心智与 API。',
    items: [
      {
        icon: Rocket,
        title: '快速开始',
        desc: '跑通第一个应用：Modules、State 与 Flows。',
        href: `${base}/guide/get-started/quick-start`,
      },
      {
        icon: Brain,
        title: 'Thinking in Logix',
        desc: '用 React 心智模型理解规则与状态。',
        href: `${base}/guide/essentials/thinking-in-logix`,
      },
      {
        icon: BookOpen,
        title: 'API 参考',
        desc: '@logix/core 与 @logix/react。',
        href: `${base}/api`,
      },
    ],
  } as const
}

export function NextSteps() {
  const params = useParams<{ lang?: string }>()
  const lang = getLang(params?.lang)
  const copy = getCopy(lang)

  return (
    <section className="py-24 px-4 border-t border-neutral-200 dark:border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black dark:text-white">{copy.title}</h2>
          <p className="text-gray-600 dark:text-neutral-400 mt-2">{copy.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {copy.items.map((item, i) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <Link
                href={item.href}
                className="group block rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-white/20"
              >
                <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-black dark:text-white transition group-hover:scale-110">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
