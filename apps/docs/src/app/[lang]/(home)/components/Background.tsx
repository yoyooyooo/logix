'use client'
import { motion } from 'framer-motion'

export function Background() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-white dark:bg-black selection:bg-cyan-500/30">
      {/* Deep Space Gradient (Dark) / Subtle Gray (Light) */}
      <div className="absolute inset-0 bg-neutral-50 dark:bg-gradient-to-b dark:from-black dark:via-neutral-950 dark:to-neutral-950 transition-colors duration-500" />

      {/* Moving Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#0f0f0f_1px,transparent_1px),linear-gradient(to_bottom,#0f0f0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
      />

      {/* Animated Glow Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 right-0 -mr-40 h-96 w-96 rounded-full bg-cyan-900/20 blur-3xl filter"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute bottom-0 left-0 -ml-40 h-96 w-96 rounded-full bg-purple-900/20 blur-3xl filter"
      />
    </div>
  )
}
