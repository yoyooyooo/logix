'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface LogixTitleProps {
  slogan: React.ReactNode
}

export function LogixTitle({ slogan }: LogixTitleProps) {
  return (
    <div className="relative flex flex-col items-start justify-center cursor-default select-none">
      <div className="relative flex items-center text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[14rem] leading-none font-black tracking-tighter text-black dark:text-white">
        {/* L O G I */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex"
        >
          <span className="tracking-tighter">Logi</span>
        </motion.div>

        {/* X */}
        <div className="relative w-[0.8em] h-[0.8em] flex items-center justify-center ml-[-0.05em]">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" /> {/* cyan-600 */}
                <stop offset="50%" stopColor="#2563eb" /> {/* blue-600 */}
                <stop offset="100%" stopColor="#9333ea" /> {/* purple-600 */}
              </linearGradient>
            </defs>

            {/* The first stroke of X (\) */}
            <motion.path
              d="M 20 20 L 80 80"
              fill="transparent"
              strokeWidth="24"
              stroke="url(#gradient)"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
                opacity: { duration: 0.1, delay: 0.2 },
              }}
            />

            {/* The second stroke of X (/) */}
            <motion.path
              d="M 80 20 L 20 80"
              fill="transparent"
              strokeWidth="24"
              stroke="url(#gradient)"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 },
                opacity: { duration: 0.1, delay: 0.5 },
              }}
            />
          </svg>

          {/* Post-animation Glow effect for X */}
          <motion.div
            className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.5, scale: 1.2 }}
            transition={{ duration: 2, delay: 1 }}
          />
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
        className="text-2xl sm:text-3xl font-medium text-neutral-500 dark:text-neutral-400 mt-8 pl-2"
      >
        {slogan}
      </motion.p>
    </div>
  )
}
