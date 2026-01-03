import type { Transition, Variants } from 'framer-motion'

export const springSnappy = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.9,
} satisfies Transition

export const springGentle = {
  type: 'spring',
  stiffness: 260,
  damping: 34,
  mass: 1,
} satisfies Transition

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: springGentle },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } },
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.02 } },
}

export const viewportOnce = { once: true, amount: 0.25 } as const
