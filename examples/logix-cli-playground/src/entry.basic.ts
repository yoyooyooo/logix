type CounterConfig = {
  readonly initial: {
    readonly count: number
  }
  readonly logics: ReadonlyArray<unknown>
}

export const Counter = {
  implement(config: CounterConfig): CounterConfig {
    return config
  },
}

export const AppRoot = Counter.implement({
  initial: { count: 0 },
  logics: [],
})
