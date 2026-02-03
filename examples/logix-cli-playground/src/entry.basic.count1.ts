import { Counter } from './entry.basic.ts'

export const AppRoot = Counter.implement({
  initial: { count: 1 },
  logics: [],
})

