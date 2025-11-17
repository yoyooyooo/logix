'use client'
import { motion } from 'framer-motion'
import { Play, SkipBack, Pause } from 'lucide-react'
import { useParams } from 'next/navigation'

const COPY = {
  zh: {
    title: '时间旅行调试',
    description: (
      <>
        不只是 Redux DevTools。记录完整执行 Trace，回滚状态，并在未来时间线中
        <span className="text-purple-600 dark:text-purple-400 font-bold mx-1">分叉与 Mock</span>。
      </>
    ),
  },
  en: {
    title: 'Time-travel debugging',
    description: (
      <>
        Not just Redux DevTools. Record full traces, roll back state, and
        <span className="text-purple-600 dark:text-purple-400 font-bold mx-1">fork and mock</span> future timelines.
      </>
    ),
  },
} as const

export function TimeTravel() {
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang === 'en' ? 'en' : 'zh'
  const copy = lang === 'en' ? COPY.en : COPY.zh

  return (
    <section className="py-32 relative overflow-hidden bg-white dark:bg-white/5 border-y border-neutral-100 dark:border-none">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-cyan-100/50 dark:from-purple-500/10 dark:to-cyan-500/10 opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-black dark:text-white mb-4">{copy.title}</h2>
          <p className="text-gray-600 dark:text-neutral-400 max-w-2xl mx-auto text-lg hover:text-black dark:hover:text-white transition-colors">
            {copy.description}
          </p>
        </div>

        {/* Mock Interface (Stays Dark for Pro Look) */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 10 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="w-full max-w-5xl mx-auto bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Toolbar */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 gap-4 bg-white/5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1" />
            <button className="p-1.5 hover:bg-white/10 rounded">
              <SkipBack className="w-4 h-4 text-neutral-400" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded">
              <Play className="w-4 h-4 text-green-400" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded">
              <Pause className="w-4 h-4 text-neutral-400" />
            </button>
            <div className="text-xs font-mono text-neutral-500 ml-4">00:12:44.201</div>
          </div>

          {/* Timeline View */}
          <div className="p-6 relative min-h-[300px] font-mono text-sm">
            {/* Timeline Track */}
            <div className="absolute top-12 left-0 right-0 h-px bg-white/10" />

            {/* Events */}
            <div className="flex gap-4 overflow-x-auto pb-4 items-start pt-8">
              {[
                { name: 'Init', time: '0s', color: 'bg-neutral-600' },
                { name: 'Click:Submit', time: '0.2s', color: 'bg-blue-500' },
                { name: 'Flow:Validate', time: '0.21s', color: 'bg-yellow-500' },
                { name: 'API:CheckInv', time: '0.4s', color: 'bg-purple-500', width: 'w-24' },
                { name: 'Flow:Commit', time: '0.8s', color: 'bg-green-500' },
              ].map((event, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer">
                  <div
                    className={`h-8 ${event.width || 'w-8'} rounded-md ${event.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all border border-white/20 shadow-lg`}
                  />
                  <span className="text-xs text-neutral-500">{event.name}</span>
                </div>
              ))}

              {/* Forked Timeline (Visual Hint) */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2 ml-8 relative opacity-50 border-l border-dashed border-white/20 pl-8">
                <span className="absolute -top-6 left-2 text-xs text-purple-400 font-bold bg-purple-900/50 px-2 rounded">
                  FORK #1 (Mock)
                </span>
                <div className="h-8 w-8 rounded-md bg-red-500 opacity-80 border border-white/20" />
                <span className="text-xs text-neutral-500">API:500</span>
              </div>
            </div>

            {/* Inspector */}
            <div className="mt-12 p-4 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-green-400">
              <div>{`> State Diff @ 0.4s (API:CheckInventory)`}</div>
              <div className="text-neutral-400 pl-4 mt-2">
                <div>{`  inventory: {`}</div>
                <div className="text-red-400">{`-   status: 'checking'`}</div>
                <div className="text-green-400">{`+   status: 'confirmed'`}</div>
                <div>{`    available: 42`}</div>
                <div>{`  }`}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
