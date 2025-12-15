import { Effect } from "effect"
import { create } from "mutative"
import type { PatchReason, StatePatch } from "../runtime/core/StateTransaction.js"
import { buildDependencyGraph } from "./graph.js"
import type { StateTraitEntry, StateTraitProgram } from "./model.js"
import { reverseClosure } from "./reverse-closure.js"

export type ValidateMode = "submit" | "blur" | "valueChange" | "manual"

export type ValidateTarget =
  | { readonly kind: "root" }
  | { readonly kind: "field"; readonly path: string }
  | { readonly kind: "list"; readonly path: string }
  | {
      readonly kind: "item"
      readonly path: string
      readonly index: number
      readonly field?: string
    }

export interface ScopedValidateRequest {
  readonly mode: ValidateMode
  readonly target: ValidateTarget
}

export interface ValidateContext<S> {
  readonly moduleId?: string
  readonly runtimeId?: string
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (patch: StatePatch) => void
}

type RuleContext = {
  readonly mode: ValidateMode
  readonly state: unknown
  readonly scope: {
    readonly fieldPath: string
    readonly listPath?: string
    readonly index?: number
  }
}

const parseSegments = (path: string): ReadonlyArray<string | number> => {
  if (!path) return []
  return path.split(".").map((seg) =>
    /^[0-9]+$/.test(seg) ? Number(seg) : seg,
  )
}

const getAtPath = (state: any, path: string): any => {
  if (!path || state == null) return state
  const segments = parseSegments(path)
  let current: any = state
  for (const seg of segments) {
    if (current == null) return undefined
    current = current[seg as any]
  }
  return current
}

const setAtPathMutating = (draft: any, path: string, value: any): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const nextKey = segments[i + 1]!

    const next = current[key as any]
    if (next == null || typeof next !== "object") {
      current[key as any] = typeof nextKey === "number" ? [] : {}
    }
    current = current[key as any]
  }

  const last = segments[segments.length - 1]!
  current[last as any] = value
}

const unsetAtPathMutating = (draft: any, path: string): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const next = current[key as any]
    if (next == null || typeof next !== "object") {
      return
    }
    current = next
  }

  const last = segments[segments.length - 1]!
  if (Array.isArray(current) && typeof last === "number") {
    current[last] = undefined
    return
  }
  if (current && typeof current === "object") {
    delete current[last as any]
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const mergeRuleErrors = (errors: ReadonlyArray<unknown>): unknown => {
  if (errors.length === 0) return undefined
  if (errors.length === 1) return errors[0]

  if (errors.every(isPlainObject)) {
    const merged: Record<string, unknown> = {}
    for (const patch of errors as ReadonlyArray<Record<string, unknown>>) {
      for (const key of Object.keys(patch)) {
        const incoming = patch[key]
        if (!(key in merged)) {
          merged[key] = incoming
          continue
        }
        const existing = merged[key]
        merged[key] = Array.isArray(existing) ? [...existing, incoming] : [existing, incoming]
      }
    }
    return merged
  }

  return errors
}

const toGraphTargets = (target: ValidateTarget): ReadonlyArray<string> => {
  if (target.kind === "root") {
    return []
  }
  if (target.kind === "field") {
    return [target.path]
  }
  if (target.kind === "list") {
    return [`${target.path}[]`]
  }
  // item
  const base = `${target.path}[]`
  return [target.field ? `${base}.${target.field}` : base]
}

const extractIndexBindings = (
  requests: ReadonlyArray<ScopedValidateRequest>,
): Map<string, ReadonlySet<number>> => {
  const map = new Map<string, Set<number>>()
  for (const req of requests) {
    if (req.target.kind !== "item") continue
    const set = map.get(req.target.path) ?? new Set<number>()
    set.add(req.target.index)
    map.set(req.target.path, set)
  }
  return map
}

const extractListBindings = (
  requests: ReadonlyArray<ScopedValidateRequest>,
): ReadonlySet<string> => {
  const set = new Set<string>()
  for (const req of requests) {
    if (req.target.kind !== "list") continue
    if (req.target.path) set.add(req.target.path)
  }
  return set
}

const resolveMode = (requests: ReadonlyArray<ScopedValidateRequest>): ValidateMode => {
  const priorities: Record<ValidateMode, number> = {
    submit: 4,
    blur: 3,
    valueChange: 2,
    manual: 1,
  }
  let best: ValidateMode = "manual"
  let bestP = priorities[best]
  for (const r of requests) {
    const p = priorities[r.mode]
    if (p > bestP) {
      bestP = p
      best = r.mode
    }
  }
  return best
}

const evalCheck = (
  entry: Extract<StateTraitEntry<any, string>, { readonly kind: "check" }>,
  input: unknown,
  ctx: RuleContext,
): unknown => {
  const rules = entry.meta.rules as Record<string, any>
  const names = Object.keys(rules).sort()
  const results: Array<unknown> = []

  for (const name of names) {
    const rule = rules[name]
    try {
      const out =
        typeof rule === "function"
          ? rule(input, ctx)
          : rule && typeof rule === "object"
            ? rule.validate(input, ctx)
            : undefined
      if (out !== undefined) results.push(out)
    } catch {
      // 规则运行期异常：保持 no-op，避免产生半成品错误树。
      // 诊断与降级在后续 Phase 由 DebugSink/DevtoolsHub 承接。
    }
  }

  return mergeRuleErrors(results)
}

type ErrorUpdate = {
  readonly errorPath: string
  readonly prev: unknown
  readonly next: unknown
  readonly stepId: string
}

/**
 * validateInTransaction：
 * - 在“已开启 StateTransaction”的上下文内执行一批 scoped validate 请求；
 * - 按 ReverseClosure 计算最小 check 集合，并将结果写回 `state.errors.*`；
 * - 若无任何实际错误变化，则不触发 draft 更新（保持 0 commit 语义）。
 */
export const validateInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: ValidateContext<S>,
  requests: ReadonlyArray<ScopedValidateRequest>,
): Effect.Effect<void, never, any> =>
  Effect.sync(() => {
    if (requests.length === 0) return

    const checks = program.entries.filter(
      (e): e is Extract<StateTraitEntry<any, string>, { readonly kind: "check" }> =>
        (e as any).kind === "check",
    )
    if (checks.length === 0) return

    const hasRoot = requests.some((r) => r.target.kind === "root")
    const draft = ctx.getDraft() as any

    // 计算待执行的 check scope（字段路径集合）。
    const scopesToValidate = (() => {
      if (hasRoot) {
        return new Set<string>(checks.map((c) => c.fieldPath))
      }
      const graph = buildDependencyGraph(program)
      const set = new Set<string>()
      for (const req of requests) {
        for (const t of toGraphTargets(req.target)) {
          for (const node of reverseClosure(graph, t)) {
            set.add(node)
          }
        }
      }
      return set
    })()

    const selectedChecks = checks.filter((c) => scopesToValidate.has(c.fieldPath))
    if (selectedChecks.length === 0) return

    // item scope binding：仅在非 root validate 下使用（root validate 会按当前数组长度跑全量）。
    const indexBindings = extractIndexBindings(requests)
    const listBindings = extractListBindings(requests)

    const mode = resolveMode(requests)
    const updates: Array<ErrorUpdate> = []

    const makeStepId = (fieldPath: string, index?: number): string =>
      index === undefined ? `check:${fieldPath}` : `check:${fieldPath}@${index}`

    for (const check of selectedChecks) {
      const scopeFieldPath = check.fieldPath

      // Phase 2：仅支持最浅层 list.item scope（形如 "items[]"）。
      if (scopeFieldPath.endsWith("[]")) {
        const listPath = scopeFieldPath.slice(0, -2)

        const indices: ReadonlyArray<number> = hasRoot || listBindings.has(listPath)
          ? (() => {
              const listValue = getAtPath(draft, listPath)
              return Array.isArray(listValue)
                ? listValue.map((_, i) => i)
                : []
            })()
          : Array.from(indexBindings.get(listPath) ?? [])

        for (const index of indices) {
          const boundValuePath = `${listPath}.${index}`
          const input = getAtPath(draft, boundValuePath)

          const nextError = evalCheck(check, input, {
            mode,
            state: draft,
            scope: { fieldPath: scopeFieldPath, listPath, index },
          })

          const errorPath = `errors.${boundValuePath}`
          const prev = getAtPath(draft, errorPath)

          if (!Object.is(prev, nextError)) {
            updates.push({
              errorPath,
              prev,
              next: nextError,
              stepId: makeStepId(scopeFieldPath, index),
            })
          }
        }

        continue
      }

      const input =
        scopeFieldPath === "$root" ? draft : getAtPath(draft, scopeFieldPath)

      const nextError = evalCheck(check, input, {
        mode,
        state: draft,
        scope: { fieldPath: scopeFieldPath },
      })

      const errorPath = `errors.${scopeFieldPath}`
      const prev = getAtPath(draft, errorPath)

      if (!Object.is(prev, nextError)) {
        updates.push({
          errorPath,
          prev,
          next: nextError,
          stepId: makeStepId(scopeFieldPath),
        })
      }
    }

    if (updates.length === 0) {
      return
    }

    const reason: PatchReason = "trait-check"

    const nextState = create(draft, (nextDraft: any) => {
      for (const u of updates) {
        if (u.next === undefined) {
          unsetAtPathMutating(nextDraft, u.errorPath)
        } else {
          setAtPathMutating(nextDraft, u.errorPath, u.next)
        }
      }
    }) as unknown as S

    ctx.setDraft(nextState)

    for (const u of updates) {
      ctx.recordPatch({
        path: u.errorPath,
        from: u.prev,
        to: u.next,
        reason,
        stepId: u.stepId,
      })
    }
  })
