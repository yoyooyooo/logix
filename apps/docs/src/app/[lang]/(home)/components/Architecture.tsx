'use client'
import { motion } from 'framer-motion'
import { Layout, GitBranch, Database } from 'lucide-react'
import { useParams } from 'next/navigation'

const LAYER_VISUALS = [
  { icon: Layout, color: 'bg-pink-500' },
  { icon: GitBranch, color: 'bg-cyan-500' },
  { icon: Database, color: 'bg-purple-500' },
]

const COPY = {
  zh: {
    title: '三位一体架构',
    description: '我们将应用解构为三个正交的维度，允许它们独立演进。',
    layers: [
      {
        title: 'UI Intent',
        subtitle: '表现层',
        description: '组件树与视觉交互',
      },
      {
        title: 'Logic Intent',
        subtitle: '行为层',
        description: '基于 Effect 的流与信号',
      },
      {
        title: 'Module Intent',
        subtitle: '数据层',
        description: 'Schema、状态与契约',
      },
    ],
  },
  en: {
    title: 'The Trinity Model',
    description: 'We deconstruct applications into three orthogonal dimensions, allowing each to evolve independently.',
    layers: [
      {
        title: 'UI Intent',
        subtitle: 'Presentation',
        description: 'Component Trees & Visual Interactions',
      },
      {
        title: 'Logic Intent',
        subtitle: 'Behavior',
        description: 'Effect-based Flow & Signalling',
      },
      {
        title: 'Module Intent',
        subtitle: 'Data',
        description: 'Schemas, State & Contracts',
      },
    ],
  },
} as const

export function Architecture() {
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang === 'en' ? 'en' : 'zh'
  const copy = lang === 'en' ? COPY.en : COPY.zh

  return (
    <section className="py-32 relative">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-black to-gray-500 dark:from-white dark:to-neutral-500 mb-4">
          {copy.title}
        </h2>
        <p className="text-gray-600 dark:text-neutral-400 max-w-2xl mx-auto">{copy.description}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {copy.layers.map((layer, index) => {
          const visual = LAYER_VISUALS[index]
          return (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="group relative p-8 rounded-3xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-neutral-900/50 backdrop-blur-xl hover:shadow-lg dark:hover:bg-neutral-800/50 transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl ${visual.color} bg-opacity-20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <visual.icon className={`w-6 h-6 ${visual.color.replace('bg-', 'text-')} dark:text-white`} />
              </div>

              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{layer.title}</h3>
              <div className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">{layer.subtitle}</div>
              <p className="text-gray-600 dark:text-neutral-400 leading-relaxed">{layer.description}</p>
              {/* Decorative border gradient */}
              <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-neutral-300 dark:group-hover:border-white/10 pointer-events-none" />
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
