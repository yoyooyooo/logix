import { Effect, Option } from 'effect'
import { create } from 'mutative'
import * as EffectOp from '../../effectop.js'
import * as EffectOpCore from '../runtime/EffectOpCore.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { isDevEnv } from '../runtime/core/env.js'
import type { PatchReason, StatePatch } from '../runtime/core/StateTransaction.js'
import * as DepsTrace from './deps-trace.js'
import type { StateTraitEntry, StateTraitProgram } from './model.js'

export class StateTraitConfigError extends Error {
  readonly _tag = 'StateTraitConfigError'

  constructor(
    readonly code: 'CYCLE_DETECTED' | 'MULTIPLE_WRITERS',
    message: string,
    readonly fields: ReadonlyArray<string> = [],
  ) {
    super(message)
    this.name = 'StateTraitConfigError'
  }
}

export type ConvergeDegradeReason = 'budget_exceeded' | 'runtime_error'

export type ConvergeMode = 'full' | 'dirty'

export interface ConvergeStepSummary {
  readonly stepId: string
  readonly kind: 'computed' | 'link'
  readonly fieldPath: string
  readonly durationMs: number
  readonly changed: boolean
}

export interface ConvergeSummary {
  readonly mode: ConvergeMode
  readonly budgetMs: number
  readonly totalDurationMs: number
  readonly totalSteps: number
  readonly executedSteps: number
  readonly skippedSteps: number
  readonly changedSteps: number
  readonly dirtyRoots?: ReadonlyArray<string>
  readonly top3: ReadonlyArray<ConvergeStepSummary>
}

export type ConvergeOutcome =
  | {
      readonly _tag: 'Converged'
      readonly patchCount: number
      readonly summary?: ConvergeSummary
    }
  | {
      readonly _tag: 'Noop'
      readonly summary?: ConvergeSummary
    }
  | {
      readonly _tag: 'Degraded'
      readonly reason: ConvergeDegradeReason
      readonly error?: unknown
      readonly summary?: ConvergeSummary
    }

export interface ConvergeContext<S> {
  readonly moduleId?: string
  readonly runtimeId?: string
  readonly now: () => number
  readonly budgetMs: number
  readonly mode?: ConvergeMode
  readonly dirtyPaths?: ReadonlySet<string> | ReadonlyArray<string>
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (patch: StatePatch) => void
}

const getAtPath = (state: any, path: string): any => {
  if (!path || state == null) return state
  const segments = path.split('.')
  let current: any = state
  for (let i = 0; i < segments.length; i++) {
    if (current == null) return undefined
    current = current[segments[i]]
  }
  return current
}

const setAtPathMutating = (draft: any, path: string, value: any): void => {
  if (!path) return
  const segments = path.split('.')
  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]
    const next = current[key]
    if (next == null || typeof next !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  current[segments[segments.length - 1]] = value
}

const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack, never, any> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

type WriterKind = 'computed' | 'link'

const getWriterKind = (entry: StateTraitEntry<any, string>): WriterKind | undefined =>
  entry.kind === 'computed' ? 'computed' : entry.kind === 'link' ? 'link' : undefined

const getWriterDeps = (entry: StateTraitEntry<any, string>): ReadonlyArray<string> => {
  if (entry.kind === 'computed') {
    return ((entry.meta as any)?.deps ?? []) as ReadonlyArray<string>
  }
  if (entry.kind === 'link') {
    return [entry.meta.from as string]
  }
  return []
}

const computeTopoOrder = (writers: ReadonlyArray<StateTraitEntry<any, string>>): ReadonlyArray<string> => {
  const writerByPath = new Map<string, StateTraitEntry<any, string>>()
  for (const entry of writers) {
    const existing = writerByPath.get(entry.fieldPath)
    if (existing) {
      throw new StateTraitConfigError(
        'MULTIPLE_WRITERS',
        `[StateTrait.converge] Multiple writers for field "${entry.fieldPath}" (${existing.kind} + ${entry.kind}).`,
        [entry.fieldPath],
      )
    }
    writerByPath.set(entry.fieldPath, entry)
  }

  const nodes = new Set<string>()
  for (const entry of writers) {
    nodes.add(entry.fieldPath)
  }

  const indegree = new Map<string, number>()
  const forward = new Map<string, Array<string>>()

  for (const node of nodes) {
    indegree.set(node, 0)
    forward.set(node, [])
  }

  for (const entry of writers) {
    const to = entry.fieldPath
    const deps = getWriterDeps(entry)
    for (const dep of deps) {
      if (!nodes.has(dep)) {
        continue
      }
      forward.get(dep)!.push(to)
      indegree.set(to, (indegree.get(to) ?? 0) + 1)
    }
  }

  const queue: Array<string> = []
  for (const [node, deg] of indegree.entries()) {
    if (deg === 0) queue.push(node)
  }

  const order: Array<string> = []
  while (queue.length) {
    const n = queue.shift()!
    order.push(n)
    const outs = forward.get(n)!
    for (const to of outs) {
      const next = (indegree.get(to) ?? 0) - 1
      indegree.set(to, next)
      if (next === 0) queue.push(to)
    }
  }

  if (order.length !== nodes.size) {
    const remaining = Array.from(nodes).filter((n) => !order.includes(n))
    throw new StateTraitConfigError(
      'CYCLE_DETECTED',
      `[StateTrait.converge] Cycle detected in computed/link graph: ${remaining.join(', ')}`,
      remaining,
    )
  }

  return order
}

const makePatch = (path: string, from: unknown, to: unknown, reason: PatchReason, stepId: string): StatePatch => ({
  path,
  from,
  to,
  reason,
  stepId,
})

const depsTraceSettled = new Set<string>()
const depsMismatchEmitted = new Set<string>()

const formatList = (items: ReadonlyArray<string>, limit = 10): string => {
  if (items.length === 0) return ''
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')}, …(+${items.length - limit})`
}

const emitDepsMismatch = (params: {
  readonly moduleId?: string
  readonly runtimeId?: string
  readonly kind: 'computed' | 'source'
  readonly fieldPath: string
  readonly diff: DepsTrace.DepsDiff
}): Effect.Effect<void, never, any> => {
  const key = `${params.runtimeId ?? 'unknown'}::${params.kind}::${params.fieldPath}`
  if (depsMismatchEmitted.has(key)) return Effect.void
  depsMismatchEmitted.add(key)

  return Debug.record({
    type: 'diagnostic',
    moduleId: params.moduleId,
    runtimeId: params.runtimeId,
    code: 'state_trait::deps_mismatch',
    severity: 'warning',
    message:
      `[deps] ${params.kind} "${params.fieldPath}" declared=[${formatList(params.diff.declared)}] ` +
      `reads=[${formatList(params.diff.reads)}] missing=[${formatList(params.diff.missing)}] ` +
      `unused=[${formatList(params.diff.unused)}]`,
    hint:
      'deps 是唯一依赖事实源：后续增量调度/反向闭包/性能优化都只认 deps。请将 deps 与实际读取保持一致；' +
      '若确实依赖整棵对象，可声明更粗粒度的 deps（例如 "profile"）以覆盖子字段读取。',
    kind: `deps_mismatch:${params.kind}`,
  })
}

const shouldSkip = (entry: StateTraitEntry<any, string>, prev: unknown, next: unknown): boolean => {
  if (entry.kind === 'computed') {
    const equals = (entry.meta as any)?.equals as ((a: unknown, b: unknown) => boolean) | undefined
    return equals ? equals(prev, next) : Object.is(prev, next)
  }
  return Object.is(prev, next)
}

const runWriterStep = <S>(
  ctx: ConvergeContext<S>,
  entry: StateTraitEntry<any, string>,
  stack: EffectOp.MiddlewareStack,
): Effect.Effect<boolean, never, any> => {
  const moduleId = ctx.moduleId
  const runtimeId = ctx.runtimeId
  const fieldPath = entry.fieldPath

  const kind = getWriterKind(entry)
  if (!kind) return Effect.succeed(false)

  const reason: PatchReason = kind === 'computed' ? 'trait-computed' : 'trait-link'
  const opKind: EffectOp.EffectOp<any, any, any>['kind'] = kind === 'computed' ? 'trait-computed' : 'trait-link'
  const opName = kind === 'computed' ? 'computed:update' : 'link:propagate'

  const stepId = kind === 'computed' ? `computed:${fieldPath}` : `link:${fieldPath}`
  const deps = getWriterDeps(entry)
  const from = kind === 'link' ? (entry.meta as any).from : undefined

  const body: Effect.Effect<boolean, never, any> = Effect.sync(() => {
    const current = ctx.getDraft() as any

    const prev = getAtPath(current, fieldPath)

    let next: unknown
    let depsDiff: DepsTrace.DepsDiff | undefined

    if (kind === 'computed') {
      const derive = (entry.meta as any).derive as (s: any) => unknown
      const traceKey = `${runtimeId ?? 'unknown'}::computed::${fieldPath}`
      if (isDevEnv() && !depsTraceSettled.has(traceKey)) {
        const traced = DepsTrace.trace((s) => derive(s), current)
        next = traced.value
        depsTraceSettled.add(traceKey)
        depsDiff = DepsTrace.diffDeps(((entry.meta as any).deps ?? []) as ReadonlyArray<string>, traced.reads)
      } else {
        next = derive(current)
      }
    } else {
      next = getAtPath(current, from as string)
    }

    const changed = !shouldSkip(entry, prev, next)
    if (!changed) {
      return { changed: false, depsDiff }
    }

    const updated = create(current, (draft) => {
      setAtPathMutating(draft, fieldPath, next)
    }) as unknown as S

    ctx.setDraft(updated)
    ctx.recordPatch(makePatch(fieldPath, prev, next, reason, stepId))
    return { changed: true, depsDiff }
  }).pipe(
    Effect.flatMap(({ changed, depsDiff }) =>
      depsDiff && kind === 'computed'
        ? emitDepsMismatch({
            moduleId,
            runtimeId,
            kind: 'computed',
            fieldPath,
            diff: depsDiff,
          }).pipe(Effect.as(changed))
        : Effect.succeed(changed),
    ),
  )

  const op = EffectOp.make<boolean, never, any>({
    kind: opKind,
    name: opName,
    effect: body,
    meta: {
      moduleId,
      runtimeId,
      fieldPath,
      deps,
      ...(kind === 'link'
        ? {
            from,
            to: fieldPath,
          }
        : null),
      stepId,
    },
  })

  return EffectOp.run(op, stack)
}

/**
 * convergeInTransaction：
 * - 在“已开启 StateTransaction”的上下文内执行一次派生收敛；
 * - 当前仅覆盖 computed/link（check/source 后续阶段接入）。
 */
export const convergeInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: ConvergeContext<S>,
): Effect.Effect<ConvergeOutcome, never, any> =>
  Effect.gen(function* () {
    const startedAt = ctx.now()
    const base = ctx.getDraft()
    const mode: ConvergeMode = ctx.mode ?? 'full'

    const writers = program.entries.filter((e) => {
      const kind = getWriterKind(e as any)
      return kind === 'computed' || kind === 'link'
    }) as ReadonlyArray<StateTraitEntry<any, string>>

    if (writers.length === 0) {
      return { _tag: 'Noop' } as const
    }

    const stack = yield* getMiddlewareStack()

    const normalizeDirtyPath = (path: string): string => {
      if (!path) return ''
      if (path === '*') return '*'
      const idx = path.indexOf('[]')
      if (idx >= 0) return path.slice(0, idx)
      const segs = path.split('.')
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]!
        if (/^[0-9]+$/.test(seg)) {
          return segs.slice(0, i).join('.')
        }
      }
      return path
    }

    const overlaps = (a: string, b: string): boolean => a === b || a.startsWith(b + '.') || b.startsWith(a + '.')

    const readDirtyRoots = (): { readonly dirtyAll: boolean; readonly roots: ReadonlyArray<string> } => {
      if (mode !== 'dirty') {
        return { dirtyAll: true, roots: ['*'] }
      }
      const raw =
        ctx.dirtyPaths == null ? [] : Array.isArray(ctx.dirtyPaths) ? ctx.dirtyPaths : Array.from(ctx.dirtyPaths)
      const normalized = raw
        .map((p) => (typeof p === 'string' ? normalizeDirtyPath(p) : ''))
        .filter((p) => typeof p === 'string' && p.length > 0)

      const hasSpecific = normalized.some((p) => p !== '*')
      const roots = hasSpecific
        ? Array.from(new Set(normalized.filter((p) => p !== '*'))).sort()
        : normalized.includes('*')
          ? ['*']
          : []
      return { dirtyAll: roots.length === 1 && roots[0] === '*', roots }
    }

    const dirty = readDirtyRoots()
    const dirtyRoots = dirty.dirtyAll ? [] : dirty.roots
    const dirtySet = new Set<string>(dirtyRoots)

    let changedCount = 0
    const steps: Array<ConvergeStepSummary> = []
    try {
      const order = computeTopoOrder(writers)
      const writerByPath = new Map<string, StateTraitEntry<any, string>>()
      for (const entry of writers) {
        writerByPath.set(entry.fieldPath, entry)
      }

      const totalSteps = order.length

      for (const fieldPath of order) {
        if (ctx.now() - startedAt > ctx.budgetMs) {
          // 超预算：软降级，回退到 base（避免产生半成品状态）。
          ctx.setDraft(base)
          const totalDurationMs = Math.max(0, ctx.now() - startedAt)
          const top3 = steps
            .slice()
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, 3)
          return {
            _tag: 'Degraded',
            reason: 'budget_exceeded',
            summary: {
              mode,
              budgetMs: ctx.budgetMs,
              totalDurationMs,
              totalSteps,
              executedSteps: steps.length,
              skippedSteps: Math.max(0, totalSteps - steps.length),
              changedSteps: steps.filter((s) => s.changed).length,
              ...(mode === 'dirty' && !dirty.dirtyAll ? { dirtyRoots } : null),
              top3,
            },
          } as const
        }
        const entry = writerByPath.get(fieldPath)
        if (!entry) continue

        if (mode === 'dirty' && !dirty.dirtyAll) {
          const deps = getWriterDeps(entry)
            .map(normalizeDirtyPath)
            .filter((p) => p.length > 0)
          const to = normalizeDirtyPath(fieldPath)
          const shouldRun =
            deps.some((d) => Array.from(dirtySet).some((root) => overlaps(d, root))) ||
            (to.length > 0 && Array.from(dirtySet).some((root) => overlaps(to, root)))

          if (!shouldRun) {
            continue
          }
        }

        const stepStartedAt = ctx.now()
        const exit = yield* Effect.exit(runWriterStep(ctx, entry, stack))
        const stepEndedAt = ctx.now()
        const durationMs = Math.max(0, stepEndedAt - stepStartedAt)
        const stepKind = entry.kind === 'computed' ? 'computed' : 'link'
        const stepId = entry.kind === 'computed' ? `computed:${fieldPath}` : `link:${fieldPath}`
        const changed = exit._tag === 'Success' ? exit.value : false
        steps.push({
          stepId,
          kind: stepKind,
          fieldPath,
          durationMs,
          changed,
        })
        if (exit._tag === 'Failure') {
          ctx.setDraft(base)
          const totalDurationMs = Math.max(0, ctx.now() - startedAt)
          const top3 = steps
            .slice()
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, 3)
          return {
            _tag: 'Degraded',
            reason: 'runtime_error',
            error: exit.cause,
            summary: {
              mode,
              budgetMs: ctx.budgetMs,
              totalDurationMs,
              totalSteps,
              executedSteps: steps.length,
              skippedSteps: Math.max(0, totalSteps - steps.length),
              changedSteps: steps.filter((s) => s.changed).length,
              ...(mode === 'dirty' && !dirty.dirtyAll ? { dirtyRoots } : null),
              top3,
            },
          } as const
        }
        if (exit.value) {
          changedCount += 1
          if (mode === 'dirty' && !dirty.dirtyAll) {
            const to = normalizeDirtyPath(fieldPath)
            if (to.length > 0) {
              dirtySet.add(to)
            }
          }
        }
      }
    } catch (e) {
      // 配置错误：硬失败（交由上层事务入口阻止提交）。
      if (e instanceof StateTraitConfigError) {
        throw e
      }
      // 运行时错误：软降级，回退到 base（避免产生半成品状态）。
      ctx.setDraft(base)
      const totalDurationMs = Math.max(0, ctx.now() - startedAt)
      const top3 = steps
        .slice()
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 3)
      return {
        _tag: 'Degraded',
        reason: 'runtime_error',
        error: e,
        summary: {
          mode,
          budgetMs: ctx.budgetMs,
          totalDurationMs,
          totalSteps: writers.length,
          executedSteps: steps.length,
          skippedSteps: Math.max(0, writers.length - steps.length),
          changedSteps: steps.filter((s) => s.changed).length,
          ...(mode === 'dirty' && !dirty.dirtyAll ? { dirtyRoots } : null),
          top3,
        },
      } as const
    }

    const totalDurationMs = Math.max(0, ctx.now() - startedAt)
    const top3 = steps
      .slice()
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 3)
    const summary: ConvergeSummary = {
      mode,
      budgetMs: ctx.budgetMs,
      totalDurationMs,
      totalSteps: writers.length,
      executedSteps: steps.length,
      skippedSteps: Math.max(0, writers.length - steps.length),
      changedSteps: steps.filter((s) => s.changed).length,
      ...(mode === 'dirty' && !dirty.dirtyAll ? { dirtyRoots } : null),
      top3,
    }

    return changedCount > 0
      ? ({ _tag: 'Converged', patchCount: changedCount, summary } as const)
      : ({ _tag: 'Noop', summary } as const)
  })
