'use client'
import { Code2, GitGraph, History, Play, Puzzle, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

type Lang = 'zh' | 'en'

const COPY = {
  zh: {
    title: '核心能力',
    description: '确定性运行 + 可观测 Trace，让规则与状态可组合、可调试。',
    features: [
      {
        name: 'React 心智模型',
        description: '像写组件一样组织规则与状态，把行为组合成 Flow。',
        icon: Code2,
      },
      {
        name: '确定性执行',
        description: '稳定的执行顺序与标识，让问题可复现。',
        icon: History,
      },
      {
        name: '统一最小 IR',
        description: '声明降解为 Static IR 与 Dynamic Trace，驱动工具链。',
        icon: GitGraph,
      },
      {
        name: '可回放调试',
        description: '回放 Trace 定位问题，必要时分叉与 Mock 做 what-if。',
        icon: Play,
      },
      {
        name: '模块隔离',
        description: '显式边界与事务窗口，避免脏读与隐式耦合。',
        icon: Puzzle,
      },
      {
        name: 'Effect 原生',
        description: '基于 Effect：错误、并发、上下文注入与资源管理。',
        icon: ShieldCheck,
      },
    ],
  },
  en: {
    title: 'Core capabilities',
    description: 'Deterministic execution with observable traces for composable rules and state.',
    features: [
      {
        name: 'React mental model',
        description: 'Organize rules and state like components; compose behavior as flows.',
        icon: Code2,
      },
      {
        name: 'Deterministic execution',
        description: 'Stable ordering and stable identities make issues reproducible.',
        icon: History,
      },
      {
        name: 'Minimal IR',
        description: 'Declarations compile to Static IR + Dynamic Trace for tooling.',
        icon: GitGraph,
      },
      {
        name: 'Replay debugging',
        description: 'Replay traces, fork timelines, and mock what-if scenarios.',
        icon: Play,
      },
      {
        name: 'Module scoping',
        description: 'Explicit boundaries prevent dirty reads and hidden coupling.',
        icon: Puzzle,
      },
      {
        name: 'Effect-native',
        description: 'Built on Effect: errors, concurrency, context, and resources.',
        icon: ShieldCheck,
      },
    ],
  },
} as const

export function FeatureCards() {
  const params = useParams<{ lang?: string }>()
  const lang: Lang = params?.lang === 'en' ? 'en' : 'zh'
  const copy = lang === 'en' ? COPY.en : COPY.zh

  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white">{copy.title}</h2>
        <p className="mt-3 text-gray-600 dark:text-neutral-400 max-w-2xl mx-auto text-lg">{copy.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {copy.features.map((feature, i) => (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 p-8 transition hover:border-neutral-300 hover:shadow-lg dark:hover:bg-white/10 dark:hover:border-white/20"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-cyan-100 dark:bg-cyan-500/10 blur-2xl transition group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/20"></div>

            <feature.icon className="h-8 w-8 text-cyan-500 dark:text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold text-black dark:text-white">{feature.name}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
