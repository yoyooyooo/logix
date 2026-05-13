import { Effect } from 'effect'
import type { KernelFallbackReason } from './kernelFallbackReason.js'

export type KernelHotPathAuditArea =
  | 'source_dirty_gate'
  | 'validate_static_ir'
  | 'selector_dirty_route'
  | 'converge_dirty_plan'

export interface KernelHotPathAuditSnapshot {
  readonly total: number
  readonly byArea: Readonly<Record<string, number>>
  readonly byReason: Readonly<Record<string, number>>
}

export interface KernelHotPathAuditSink {
  readonly recordFallback: (area: KernelHotPathAuditArea, reason: KernelFallbackReason) => void
  readonly snapshot: () => KernelHotPathAuditSnapshot
}

let currentSink: KernelHotPathAuditSink | undefined

const bump = (target: Record<string, number>, key: string): void => {
  target[key] = (target[key] ?? 0) + 1
}

export const makeKernelHotPathAuditSink = (): KernelHotPathAuditSink => {
  let total = 0
  const byArea: Record<string, number> = {}
  const byReason: Record<string, number> = {}

  return {
    recordFallback: (area, reason) => {
      total += 1
      bump(byArea, area)
      bump(byReason, reason)
    },
    snapshot: () => ({
      total,
      byArea: { ...byArea },
      byReason: { ...byReason },
    }),
  }
}

export const recordKernelHotPathFallback = (
  area: KernelHotPathAuditArea,
  reason: KernelFallbackReason,
): void => {
  const sink = currentSink
  if (!sink) return
  sink.recordFallback(area, reason)
}

export const withKernelHotPathAuditSink = <A, E, R>(
  sink: KernelHotPathAuditSink,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = currentSink
      currentSink = sink
      return previous
    }),
    () => effect,
    (previous) =>
      Effect.sync(() => {
        currentSink = previous
      }),
  )
