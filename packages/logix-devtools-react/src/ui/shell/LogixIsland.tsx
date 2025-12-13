import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIslandState } from '../../state/island'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

export const LogixIsland: React.FC = () => {
  const state = useIslandState()

  // 用内容测量来驱动 width 动画，避免 layout 的 FLIP 缩放导致圆角/边框抖动。
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [contentSize, setContentSize] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  React.useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setContentSize({
        width: rect.width,
        height: rect.height,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Dynamic values
  const isHot = 'heat' in state && state.heat > 0.8
  let glowColor = 'rgba(255,255,255,0.15)' // Idle glow

  if (state.type === 'active') {
    glowColor = isHot ? 'rgba(236,72,153,0.5)' : 'rgba(6,182,212,0.4)'
  } else if (state.type === 'settle') {
    glowColor = 'rgba(16,185,129,0.5)'
  }

  // Apple-style Spring
  const springTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  }

  const expanded = state.type !== 'idle'
  const targetWidth = expanded ? Math.max(24, Math.ceil(contentSize.width)) : 8

  return (
    // Positioning Wrapper:
    // - Spans full width to allow Flexbox centering.
    // - Height 0 + overflow-visible to avoid blocking clicks on the rest of the screen.
    <div className="fixed top-0 left-0 w-full h-0 z-[9999] flex justify-center overflow-visible pointer-events-none">
      <motion.div
        transition={springTransition}
        className={cn(
          // Self-styles
          'relative pointer-events-auto overflow-hidden',
          'border border-white/10 ring-1 ring-white/5 shadow-2xl',
          'flex items-center justify-center', // Inner content centering
        )}
        style={{
          boxShadow: `0 0 0 1px inset rgba(255,255,255,0.05), 0 10px 40px -10px ${glowColor}`,
        }}
        initial={false}
        animate={{
          // Use marginTop for vertical position instead of 'y' transform
          marginTop: state.type === 'idle' ? 8 : 16,
          width: targetWidth,
          height: state.type === 'idle' ? 8 : 40,
          // 始终保持完全圆角，避免 borderRadius 的 spring 过冲导致瞬间方角
          borderRadius: 9999,
        }}
      >
        {/* 背景与 blur 拆到内层，避免 layout 缩放时 backdrop-filter 造成圆角裁剪抖动 */}
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" />

        <div ref={contentRef} className="relative z-10 flex items-center justify-center h-full shrink-0">
          <AnimatePresence mode="popLayout" initial={false}>
          {state.type === 'idle' && (
            <motion.div
              key="idle-dot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-2 h-2"
            />
          )}

          {state.type === 'active' && (
            <motion.div
              key="active-content"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 px-5 whitespace-nowrap overflow-hidden h-full shrink-0"
            >
              {/* Pulse Icon */}
              <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                <div
                  className={cn(
                    'absolute w-full h-full rounded-full animate-ping opacity-75',
                    isHot ? 'bg-pink-500' : 'bg-cyan-500',
                  )}
                />
                <div className={cn('relative w-2 h-2 rounded-full', isHot ? 'bg-pink-400' : 'bg-cyan-400')} />
              </div>

              {/* Labels */}
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase mb-0.5">Processing</span>
                <motion.span
                  key={state.count}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-bold font-mono text-white block"
                >
                  {state.count} <span className="text-zinc-500 font-normal">OPS</span>
                </motion.span>
              </div>

              {/* Timer */}
              <div className="w-px h-5 bg-white/10 mx-2 shrink-0" />
              <span className="text-xs font-mono text-zinc-400 tabular-nums">
                {((Date.now() - state.startTime) / 1000).toFixed(1)}s
              </span>
            </motion.div>
          )}

          {state.type === 'settle' && (
            <motion.div
              key="settle-content"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.4 }}
              className="flex items-center gap-2.5 px-4 whitespace-nowrap overflow-hidden h-full shrink-0"
            >
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11.5 3.5L5.25 9.75L2.5 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">
                {state.count} <span className="text-emerald-400 font-normal text-xs">Done</span>
              </span>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
