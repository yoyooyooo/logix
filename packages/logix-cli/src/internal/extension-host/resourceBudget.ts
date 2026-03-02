import { asSerializableErrorSummary, makeCliError, type SerializableErrorSummary } from '../errors.js'

export type ResourceBudgetLimits = {
  readonly timeoutMs: number
  readonly maxCpuMs?: number
  readonly maxMemoryMb?: number
  readonly maxQueueSize?: number
}

export type ResourceBudgetEvent = {
  readonly schemaVersion: 1
  readonly kind: 'ResourceBudgetEvent'
  readonly event: 'queue.accepted' | 'task.started' | 'task.finished' | 'budget.violated' | 'fallback.applied'
  readonly label: string
  readonly inFlight: number
  readonly detail?: Readonly<Record<string, string | number | boolean>>
}

export type ResourceBudgetRecorder = (event: ResourceBudgetEvent) => void

export type ResourceBudgetFallbackResult<T> =
  | {
      readonly ok: true
      readonly usedFallback: false
      readonly value: T
      readonly events: ReadonlyArray<ResourceBudgetEvent>
    }
  | {
      readonly ok: false
      readonly usedFallback: true
      readonly value: T
      readonly error: SerializableErrorSummary
      readonly events: ReadonlyArray<ResourceBudgetEvent>
    }

const toMb = (bytes: number): number => bytes / (1024 * 1024)

const makeEvent = (
  args: Omit<ResourceBudgetEvent, 'schemaVersion' | 'kind'>,
): ResourceBudgetEvent => ({
  schemaVersion: 1,
  kind: 'ResourceBudgetEvent',
  ...args,
})

export class ResourceBudgetExecutor {
  private inFlight = 0

  constructor(private readonly limits: ResourceBudgetLimits) {}

  private emit(
    events: ResourceBudgetEvent[],
    recorder: ResourceBudgetRecorder | undefined,
    event: Omit<ResourceBudgetEvent, 'schemaVersion' | 'kind'>,
  ): void {
    const payload = makeEvent(event)
    events.push(payload)
    recorder?.(payload)
  }

  async runWithBudget<T>(args: {
    readonly label: string
    readonly task: () => Promise<T>
    readonly recorder?: ResourceBudgetRecorder
  }): Promise<{ readonly value: T; readonly events: ReadonlyArray<ResourceBudgetEvent> }> {
    const events: ResourceBudgetEvent[] = []
    const maxQueueSize = this.limits.maxQueueSize ?? Number.POSITIVE_INFINITY
    if (this.inFlight >= maxQueueSize) {
      this.emit(events, args.recorder, {
        event: 'budget.violated',
        label: args.label,
        inFlight: this.inFlight,
        detail: { reason: 'queue', maxQueueSize },
      })
      throw makeCliError({
        code: 'EXT_HOOK_QUEUE_LIMIT_EXCEEDED',
        message: `[Logix][CLI] 扩展队列超限（label=${args.label}）`,
      })
    }

    this.inFlight += 1
    this.emit(events, args.recorder, {
      event: 'queue.accepted',
      label: args.label,
      inFlight: this.inFlight,
      detail: { timeoutMs: this.limits.timeoutMs },
    })

    const cpuStart = process.cpuUsage()
    const rssStart = process.memoryUsage().rss

    let timeoutRef: NodeJS.Timeout | undefined
    try {
      this.emit(events, args.recorder, {
        event: 'task.started',
        label: args.label,
        inFlight: this.inFlight,
      })

      const timedTask = new Promise<T>((resolve, reject) => {
        timeoutRef = setTimeout(() => {
          reject(
            makeCliError({
              code: 'EXT_HOOK_TIMEOUT',
              message: `[Logix][CLI] 扩展执行超时（label=${args.label}, timeoutMs=${this.limits.timeoutMs}）`,
            }),
          )
        }, this.limits.timeoutMs)

        args.task().then(resolve, reject)
      })

      const value = await timedTask
      const cpuDelta = process.cpuUsage(cpuStart)
      const cpuMs = (cpuDelta.user + cpuDelta.system) / 1000
      const rssMb = toMb(Math.max(rssStart, process.memoryUsage().rss))

      if (typeof this.limits.maxCpuMs === 'number' && cpuMs > this.limits.maxCpuMs) {
        this.emit(events, args.recorder, {
          event: 'budget.violated',
          label: args.label,
          inFlight: this.inFlight,
          detail: { reason: 'cpu', cpuMs, maxCpuMs: this.limits.maxCpuMs },
        })
        throw makeCliError({
          code: 'EXT_HOOK_CPU_LIMIT_EXCEEDED',
          message: `[Logix][CLI] 扩展 CPU 预算超限（label=${args.label}）`,
        })
      }

      if (typeof this.limits.maxMemoryMb === 'number' && rssMb > this.limits.maxMemoryMb) {
        this.emit(events, args.recorder, {
          event: 'budget.violated',
          label: args.label,
          inFlight: this.inFlight,
          detail: { reason: 'memory', rssMb, maxMemoryMb: this.limits.maxMemoryMb },
        })
        throw makeCliError({
          code: 'EXT_HOOK_MEMORY_LIMIT_EXCEEDED',
          message: `[Logix][CLI] 扩展内存预算超限（label=${args.label}）`,
        })
      }

      this.emit(events, args.recorder, {
        event: 'task.finished',
        label: args.label,
        inFlight: this.inFlight,
        detail: { cpuMs, rssMb },
      })

      return { value, events }
    } finally {
      if (timeoutRef) clearTimeout(timeoutRef)
      this.inFlight = Math.max(0, this.inFlight - 1)
    }
  }

  async runWithFallback<T>(args: {
    readonly label: string
    readonly task: () => Promise<T>
    readonly fallback: (error: SerializableErrorSummary) => Promise<T>
    readonly recorder?: ResourceBudgetRecorder
  }): Promise<ResourceBudgetFallbackResult<T>> {
    try {
      const result = await this.runWithBudget({
        label: args.label,
        task: args.task,
        recorder: args.recorder,
      })
      return {
        ok: true,
        usedFallback: false,
        value: result.value,
        events: result.events,
      }
    } catch (cause) {
      const error = asSerializableErrorSummary(cause)
      const fallbackValue = await args.fallback(error)
      const event = makeEvent({
        event: 'fallback.applied',
        label: args.label,
        inFlight: this.inFlight,
        detail: { reasonCode: error.code ?? 'UNKNOWN' },
      })
      args.recorder?.(event)
      return {
        ok: false,
        usedFallback: true,
        value: fallbackValue,
        error,
        events: [event],
      }
    }
  }
}
