import { Effect, Option } from 'effect'
import * as EffectOp from '../effect-op.js'
import * as EffectOpCore from '../runtime/core/EffectOpCore.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { isDevEnv } from '../runtime/core/env.js'
import { RunSessionTag } from '../verification/runSession.js'
import type { PatchReason } from '../runtime/core/StateTransaction.js'
import type { FieldPath } from '../field-path.js'
import { emitDepsMismatch, onceInRunSession } from './converge-diagnostics.js'
import type { ConvergeContext } from './converge.types.js'
import type { ConvergeExecIr } from './converge-exec-ir.js'
import * as DepsTrace from './deps-trace.js'
import type { FieldEntry } from './model.js'
import * as RowId from './rowid.js'

export const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

type WriterKind = 'computed' | 'link'

const getWriterKind = (entry: FieldEntry<any, string>): WriterKind | undefined =>
  entry.kind === 'computed' ? 'computed' : entry.kind === 'link' ? 'link' : undefined

const getWriterDeps = (entry: FieldEntry<any, string>): ReadonlyArray<string> => {
  if (entry.kind === 'computed') {
    return ((entry.meta as any)?.deps ?? []) as ReadonlyArray<string>
  }
  if (entry.kind === 'link') {
    return [entry.meta.from as string]
  }
  return []
}

const shouldSkip = (entry: FieldEntry<any, string>, prev: unknown, next: unknown): boolean => {
  if (entry.kind === 'computed') {
    const equals = (entry.meta as any)?.equals as ((a: unknown, b: unknown) => boolean) | undefined
    return equals ? equals(prev, next) : Object.is(prev, next)
  }
  return Object.is(prev, next)
}

const toDraftPath = (path: string): FieldPath =>
  path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

const joinPath = (prefix: string, suffix: string): string => {
  if (!prefix) return suffix
  if (!suffix) return prefix
  return `${prefix}.${suffix}`
}

const enumerateConcreteValuePaths = (
  rootState: unknown,
  patternPath: string,
): ReadonlyArray<{
  readonly valuePath: string
  readonly rowIndices: ReadonlyArray<number>
}> => {
  const segments = patternPath.split('.').filter(Boolean)
  const out: Array<{ readonly valuePath: string; readonly rowIndices: ReadonlyArray<number> }> = []

  const visit = (segmentIndex: number, currentPath: string, rowIndices: ReadonlyArray<number>): void => {
    if (segmentIndex >= segments.length) {
      out.push({ valuePath: currentPath, rowIndices })
      return
    }

    const segment = segments[segmentIndex]!
    if (segment.endsWith('[]')) {
      const listName = segment.slice(0, -2)
      const listPath = joinPath(currentPath, listName)
      const rows = RowId.getAtPath(rootState, listPath)
      const items = Array.isArray(rows) ? rows : []
      for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
        visit(segmentIndex + 1, joinPath(listPath, String(rowIndex)), [...rowIndices, rowIndex])
      }
      return
    }

    visit(segmentIndex + 1, joinPath(currentPath, segment), rowIndices)
  }

  visit(0, '', [])
  return out
}

const runRowScopedComputedStep = <S extends object>(params: {
  readonly ctx: ConvergeContext<S>
  readonly draft: {
    readonly getRoot: () => S
    readonly getAt: (path: FieldPath) => unknown
    readonly setAt: (path: FieldPath, value: unknown, prev?: unknown) => void
  }
  readonly entry: FieldEntry<any, string>
  readonly outPath: FieldPath
  readonly reason: PatchReason
  readonly stepId?: number
}): boolean | undefined => {
  if (params.entry.kind !== 'computed') return undefined

  const meta = params.entry.meta as {
    readonly _rowScopeSourceListPath?: unknown
    readonly _companionDeriveRow?: ((rootState: unknown, rowValue: unknown, rowIndex: number) => unknown) | undefined
    readonly _formCompanion?: unknown
    readonly _companionValuePatternPath?: unknown
    readonly _companionDeriveAtPath?:
      | ((
          rootState: unknown,
          valuePath: string,
          sourcePath: string,
          rowIndices: ReadonlyArray<number>,
        ) => unknown)
      | undefined
  }

  if (meta._formCompanion !== true) return undefined

  const valuePatternPath =
    typeof meta._companionValuePatternPath === 'string' && meta._companionValuePatternPath.includes('[]')
      ? meta._companionValuePatternPath
      : undefined
  const deriveAtPath = typeof meta._companionDeriveAtPath === 'function' ? meta._companionDeriveAtPath : undefined

  if (valuePatternPath && deriveAtPath) {
    let changed = false
    for (const concrete of enumerateConcreteValuePaths(params.draft.getRoot(), valuePatternPath)) {
      const concreteOutPath = `ui.${concrete.valuePath}.$companion`
      const concreteFieldPath = toDraftPath(concreteOutPath)
      const prev = params.draft.getAt(concreteFieldPath)
      const next = deriveAtPath(params.draft.getRoot(), concrete.valuePath, concrete.valuePath, concrete.rowIndices)
      if (shouldSkip(params.entry, prev, next)) continue

      params.draft.setAt(concreteFieldPath, next, prev)
      params.ctx.setDraft(params.draft.getRoot())
      params.ctx.recordPatch(concreteOutPath, params.reason, prev, next, undefined, params.stepId)
      changed = true
    }
    return changed
  }

  const sourceListPath =
    typeof meta._rowScopeSourceListPath === 'string' && meta._rowScopeSourceListPath.length > 0
      ? meta._rowScopeSourceListPath
      : undefined
  const deriveRow = typeof meta._companionDeriveRow === 'function' ? meta._companionDeriveRow : undefined
  if (!sourceListPath || !deriveRow) return undefined

  const outListItem = RowId.parseListItemFieldPath(params.entry.fieldPath)
  if (!outListItem) return undefined

  const rows = RowId.getAtPath(params.draft.getRoot(), sourceListPath)
  const items = Array.isArray(rows) ? rows : []
  let changed = false

  for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
    const concreteOutPath = RowId.toListItemValuePath(outListItem.listPath, rowIndex, outListItem.itemPath)
    const concreteFieldPath = toDraftPath(concreteOutPath)
    const prev = params.draft.getAt(concreteFieldPath)
    const next = deriveRow(params.draft.getRoot(), items[rowIndex], rowIndex)
    if (shouldSkip(params.entry, prev, next)) continue

    params.draft.setAt(concreteFieldPath, next, prev)
    params.ctx.setDraft(params.draft.getRoot())
    params.ctx.recordPatch(concreteOutPath, params.reason, prev, next, undefined, params.stepId)
    changed = true
  }

  return changed
}

export const runWriterStepOffFast = <S extends object>(
  ctx: ConvergeContext<S>,
  execIr: ConvergeExecIr,
  draft: {
    readonly getRoot: () => S
    readonly getAt: (path: FieldPath) => unknown
    readonly setAt: (path: FieldPath, value: unknown, prev?: unknown) => void
  },
  stepId: number,
  entry: FieldEntry<any, string>,
): boolean => {
  const kind = getWriterKind(entry)
  if (!kind) return false

  const reason: PatchReason = kind === 'computed' ? 'field-computed' : 'field-link'
  const from = kind === 'link' ? (entry.meta as any).from : undefined
  const outPathId = execIr.stepOutFieldPathIdByStepId[stepId]
  const outPath = execIr.fieldPathsById[outPathId]!
  const fromPathId = execIr.stepFromFieldPathIdByStepId[stepId]
  const fromPath = fromPathId >= 0 ? execIr.fieldPathsById[fromPathId] : undefined

  const current = draft.getRoot() as any
  const prev = draft.getAt(outPath)

  const rowScoped = runRowScopedComputedStep({
    ctx,
    draft,
    entry,
    outPath,
    reason,
  })
  if (rowScoped !== undefined) return rowScoped

  let next: unknown
  if (kind === 'computed') {
    const derive = (entry.meta as any).derive as (s: any) => unknown
    next = derive(current)
  } else {
    if (!fromPath) {
      throw new Error(`[FieldKernel.converge] Missing link.from FieldPathId: from="${String(from)}"`)
    }
    next = draft.getAt(fromPath)
  }

  const changed = !shouldSkip(entry, prev, next)
  if (!changed) return false

  draft.setAt(outPath, next, prev)
  ctx.setDraft(draft.getRoot())
  ctx.recordPatch(outPathId, reason, prev, next)
  return true
}

export const runWriterStep = <S extends object>(
  ctx: ConvergeContext<S>,
  execIr: ConvergeExecIr,
  draft: {
    readonly getRoot: () => S
    readonly getAt: (path: FieldPath) => unknown
    readonly setAt: (path: FieldPath, value: unknown, prev?: unknown) => void
  },
  stepId: number,
  entry: FieldEntry<any, string>,
  shouldCollectDecision: boolean,
  diagnosticsLevel: Debug.DiagnosticsLevel,
  stack: EffectOp.MiddlewareStack,
): Effect.Effect<boolean> => {
  const moduleId = ctx.moduleId
  const instanceId = ctx.instanceId
  const fieldPath = entry.fieldPath

  const kind = getWriterKind(entry)
  if (!kind) return Effect.succeed(false)

  const reason: PatchReason = kind === 'computed' ? 'field-computed' : 'field-link'
  const opKind: EffectOp.EffectOp<any, any, any>['kind'] = kind === 'computed' ? 'field-computed' : 'field-link'
  const opName = kind === 'computed' ? 'computed:update' : 'link:propagate'

  const deps = getWriterDeps(entry)
  const from = kind === 'link' ? (entry.meta as any).from : undefined
  const outPathId = execIr.stepOutFieldPathIdByStepId[stepId]
  const outPath = execIr.fieldPathsById[outPathId]!
  const fromPathId = execIr.stepFromFieldPathIdByStepId[stepId]
  const fromPath = fromPathId >= 0 ? execIr.fieldPathsById[fromPathId] : undefined

  const runBody = (shouldTraceDeps: boolean): Effect.Effect<boolean> =>
    Effect.sync(() => {
      const current = draft.getRoot() as any
      const rowScoped = runRowScopedComputedStep({
        ctx,
        draft,
        entry,
        outPath,
        reason,
        stepId,
      })
      if (rowScoped !== undefined) {
        return {
          changed: rowScoped,
          depsDiff: undefined,
        }
      }

      const prev = draft.getAt(outPath)

      let next: unknown
      let depsDiff: DepsTrace.DepsDiff | undefined

      if (kind === 'computed') {
        const derive = (entry.meta as any).derive as (s: any) => unknown
        if (shouldTraceDeps) {
          const traced = DepsTrace.trace((s) => derive(s), current)
          next = traced.value
          depsDiff = DepsTrace.diffDeps(((entry.meta as any).deps ?? []) as ReadonlyArray<string>, traced.reads)
        } else {
          next = derive(current)
        }
      } else {
        if (!fromPath) {
          throw new Error(`[FieldKernel.converge] Missing link.from FieldPathId: from="${String(from)}"`)
        }
        next = draft.getAt(fromPath)
      }

      const changed = !shouldSkip(entry, prev, next)
      if (!changed) {
        return { changed: false, depsDiff }
      }

      draft.setAt(outPath, next, prev)
      ctx.setDraft(draft.getRoot())
      ctx.recordPatch(outPathId, reason, prev, next, undefined, stepId)
      return { changed: true, depsDiff }
    }).pipe(
      Effect.flatMap(({ changed, depsDiff }) =>
        depsDiff && kind === 'computed'
          ? emitDepsMismatch({
              moduleId,
              instanceId,
              kind: 'computed',
              fieldPath,
              diff: depsDiff,
            }).pipe(Effect.as(changed))
          : Effect.succeed(changed),
      ),
    )

  if (stack.length === 0) {
    if (!(kind === 'computed' && shouldCollectDecision && isDevEnv())) {
      return runBody(false)
    }
    return Effect.gen(function* () {
      const traceKey = `${moduleId ?? 'unknown'}::${instanceId ?? 'unknown'}::computed::${fieldPath}`
      const shouldTraceDeps = yield* onceInRunSession(`deps_trace:settled:${traceKey}`)
      return yield* runBody(shouldTraceDeps)
    })
  }

  return Effect.gen(function* () {
    const stepLabel = diagnosticsLevel === 'off' ? undefined : (execIr.stepLabelByStepId[stepId] ?? String(stepId))

    let shouldTraceDeps = false
    if (kind === 'computed' && shouldCollectDecision && isDevEnv()) {
      const traceKey = `${moduleId ?? 'unknown'}::${instanceId ?? 'unknown'}::computed::${fieldPath}`
      shouldTraceDeps = yield* onceInRunSession(`deps_trace:settled:${traceKey}`)
    }

    const body = runBody(shouldTraceDeps)

    const meta: any = {
      moduleId,
      instanceId,
      txnSeq: ctx.txnSeq,
      txnId: ctx.txnId,
      fieldPath,
      deps,
      ...(kind === 'link'
        ? {
            from,
            to: fieldPath,
          }
        : null),
      ...(stepLabel ? { stepId: stepLabel } : null),
    }

    if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
      const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
      if (Option.isSome(sessionOpt)) {
        const key = instanceId ?? 'global'
        meta.opSeq = sessionOpt.value.local.nextSeq('opSeq', key)
      }
    }

    const op = EffectOp.make<boolean, never, never>({
      kind: opKind,
      name: opName,
      effect: body,
      meta,
    })

    return yield* EffectOp.run(op, stack)
  })
}
