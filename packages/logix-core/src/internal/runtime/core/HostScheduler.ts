export type Cancel = () => void

export type HostScheduler = {
  readonly nowMs: () => number
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleMacrotask: (cb: () => void) => Cancel
  readonly scheduleAnimationFrame: (cb: () => void) => Cancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => Cancel
}

const noopCancel: Cancel = () => {}

const safeNowMs = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    try {
      const v = perf.now()
      if (typeof v === 'number' && Number.isFinite(v)) return v
    } catch {
      // fallthrough
    }
  }

  return Date.now()
}

const safeQueueMicrotask = (cb: () => void): void => {
  const qm = (globalThis as any).queueMicrotask as ((run: () => void) => void) | undefined
  if (typeof qm === 'function') {
    try {
      qm(cb)
      return
    } catch {
      // fallthrough
    }
  }

  // Promise job fallback (still a microtask boundary).
  try {
    Promise.resolve().then(cb)
  } catch {
    // last resort
    setTimeout(cb, 0)
  }
}

const safeSetTimeout = (ms: number, cb: () => void): Cancel => {
  const id = setTimeout(cb, ms)
  return () => {
    try {
      clearTimeout(id)
    } catch {
      // best-effort
    }
  }
}

const makeMessageChannelMacrotask = (): ((cb: () => void) => Cancel) | undefined => {
  const MC = (globalThis as any).MessageChannel as { new (): MessageChannel } | undefined
  if (typeof MC !== 'function') return undefined

  let channel: MessageChannel
  try {
    channel = new MC()
  } catch {
    return undefined
  }

  type Task = { canceled: boolean; cb: () => void }
  const queue: Array<Task> = []
  let scheduled = false

  const flush = (): void => {
    scheduled = false
    const tasks = queue.splice(0, queue.length)
    for (const t of tasks) {
      if (t.canceled) continue
      try {
        t.cb()
      } catch {
        // best-effort
      }
    }
  }

  try {
    channel.port1.onmessage = flush
  } catch {
    return undefined
  }

  const schedule = (cb: () => void): Cancel => {
    const task: Task = { canceled: false, cb }
    queue.push(task)
    if (!scheduled) {
      scheduled = true
      try {
        channel.port2.postMessage(undefined)
      } catch {
        scheduled = false
        // fallback to timeout if postMessage fails
        return safeSetTimeout(0, cb)
      }
    }
    return () => {
      task.canceled = true
    }
  }

  return schedule
}

const makeSetImmediateMacrotask = (): ((cb: () => void) => Cancel) | undefined => {
  const si = (globalThis as any).setImmediate as ((run: () => void) => any) | undefined
  const ci = (globalThis as any).clearImmediate as ((id: any) => void) | undefined
  if (typeof si !== 'function') return undefined

  return (cb) => {
    let id: any
    try {
      id = si(cb)
    } catch {
      return safeSetTimeout(0, cb)
    }

    return () => {
      if (typeof ci !== 'function') return
      try {
        ci(id)
      } catch {
        // best-effort
      }
    }
  }
}

const makeRaf = (): ((cb: () => void) => Cancel) | undefined => {
  const raf = (globalThis as any).requestAnimationFrame as ((run: () => void) => number) | undefined
  const cancel = (globalThis as any).cancelAnimationFrame as ((id: number) => void) | undefined
  if (typeof raf !== 'function') return undefined

  return (cb) => {
    let id: number
    try {
      id = raf(cb)
    } catch {
      return noopCancel
    }

    return () => {
      if (typeof cancel !== 'function') return
      try {
        cancel(id)
      } catch {
        // best-effort
      }
    }
  }
}

export const makeDefaultHostScheduler = (): HostScheduler => {
  const macrotask =
    makeSetImmediateMacrotask() ??
    makeMessageChannelMacrotask() ??
    ((cb: () => void) => safeSetTimeout(0, cb))

  const raf = makeRaf()

  return {
    nowMs: safeNowMs,
    scheduleMicrotask: safeQueueMicrotask,
    scheduleMacrotask: macrotask,
    scheduleAnimationFrame: (cb) => raf?.(cb) ?? macrotask(cb),
    scheduleTimeout: safeSetTimeout,
  }
}

let globalHostScheduler: HostScheduler | undefined

export const getGlobalHostScheduler = (): HostScheduler => {
  globalHostScheduler ??= makeDefaultHostScheduler()
  return globalHostScheduler
}

export const __unsafeSetGlobalHostSchedulerForTests = (next: HostScheduler | undefined): void => {
  globalHostScheduler = next
}

export type DeterministicHostScheduler = HostScheduler & {
  readonly flushMicrotasks: (options?: { readonly max?: number }) => number
  readonly flushOneMacrotask: () => boolean
  readonly flushAll: (options?: { readonly maxTurns?: number }) => { readonly turns: number; readonly ran: number }
  readonly getQueueSize: () => { readonly microtasks: number; readonly macrotasks: number }
}

export const makeDeterministicHostScheduler = (): DeterministicHostScheduler => {
  const microtasks: Array<() => void> = []
  const macrotasks: Array<{ canceled: boolean; cb: () => void }> = []

  const flushMicrotasks = (options?: { readonly max?: number }): number => {
    const max = options?.max ?? 10_000
    let ran = 0
    while (microtasks.length > 0 && ran < max) {
      const cb = microtasks.shift()!
      ran += 1
      try {
        cb()
      } catch {
        // best-effort
      }
    }
    return ran
  }

  const flushOneMacrotask = (): boolean => {
    const t = macrotasks.shift()
    if (!t) return false
    if (t.canceled) return true
    try {
      t.cb()
    } catch {
      // best-effort
    }
    return true
  }

  const flushAll = (options?: { readonly maxTurns?: number }): { turns: number; ran: number } => {
    const maxTurns = options?.maxTurns ?? 10_000
    let turns = 0
    let ran = 0

    while (turns < maxTurns) {
      const before = microtasks.length + macrotasks.length
      ran += flushMicrotasks()
      if (microtasks.length > 0) {
        turns += 1
        continue
      }
      if (flushOneMacrotask()) {
        turns += 1
        continue
      }
      const after = microtasks.length + macrotasks.length
      if (after === 0 || after === before) break
      turns += 1
    }

    return { turns, ran }
  }

  return {
    nowMs: safeNowMs,
    scheduleMicrotask: (cb) => {
      microtasks.push(cb)
    },
    scheduleMacrotask: (cb) => {
      const task = { canceled: false, cb }
      macrotasks.push(task)
      return () => {
        task.canceled = true
      }
    },
    scheduleAnimationFrame: (cb) => {
      const task = { canceled: false, cb }
      macrotasks.push(task)
      return () => {
        task.canceled = true
      }
    },
    scheduleTimeout: (_ms, cb) => {
      const task = { canceled: false, cb }
      macrotasks.push(task)
      return () => {
        task.canceled = true
      }
    },
    flushMicrotasks,
    flushOneMacrotask,
    flushAll,
    getQueueSize: () => ({ microtasks: microtasks.length, macrotasks: macrotasks.length }),
  }
}
