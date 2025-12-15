import * as Logix from "@logix/core"
import { Duration, Effect, Fiber } from "effect"
import type { FormShape } from "../form.js"

export type FormValidateMode = "onChange" | "onBlur" | "onSubmit" | "all"

export interface FormInstallConfig {
  readonly mode?: FormValidateMode
  readonly debounceMs?: number
  /**
   * listValidateOnChange：
   * - 当 setValue 命中某个 list.item 字段（如 "items.0.xxx"）时，
   *   若其 listPath（如 "items"）在该集合内，则将 validate target 提升为 Ref.list(listPath)，
   *   以便运行 items[] scope 的 check 全量刷新（用于跨行互斥/联动校验）。
   */
  readonly listValidateOnChange?: ReadonlyArray<string>
}

const isAuxRootPath = (path: string): boolean =>
  path === "errors" ||
  path === "ui" ||
  path.startsWith("errors.") ||
  path.startsWith("ui.")

const toPatternPath = (path: string): string => {
  if (!path) return path
  const segments = path.split(".").filter(Boolean)
  return segments
    .map((seg) => (/^[0-9]+$/.test(seg) ? "[]" : seg))
    .join(".")
    .replace(/\.\[\]/g, "[]")
}

const isDepAffectedByChange = (dep: string, changed: string): boolean => {
  if (!dep || !changed) return false
  if (dep === changed) return true
  if (changed.startsWith(`${dep}.`)) return true
  if (changed.startsWith(`${dep}[]`)) return true
  return false
}

const tryParseSingleIndexFieldPath = (
  path: string,
): { readonly listPath: string; readonly index: number; readonly field?: string } | undefined => {
  const segments = path.split(".")
  let indexPos = -1
  let index = -1
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    if (/^[0-9]+$/.test(seg)) {
      if (indexPos !== -1) return undefined
      indexPos = i
      index = Number(seg)
    }
  }

  if (indexPos <= 0) return undefined

  const listPath = segments.slice(0, indexPos).join(".")
  if (!listPath) return undefined

  const fieldRest = segments.slice(indexPos + 1).join(".")
  return {
    listPath,
    index,
    field: fieldRest ? fieldRest : undefined,
  }
}

type InstallActionMap = {
  readonly setValue: Logix.AnySchema
  readonly blur: Logix.AnySchema
} & Record<string, Logix.AnySchema>

/**
 * Form.install：
 * - 领域默认 wiring：把 UI 事件（setValue/blur）映射为 scopedValidate（ReverseClosure 由 kernel 保证）；
 * - UI 子树写入（dirty/touched）由 reducer 保证同步提交，避免 tearing；
 * - 默认不在 React 侧散落 useEffect 触发。
 */
export const install = <TValues extends object>(
  module: Logix.ModuleInstance<any, FormShape<TValues>>,
  config?: FormInstallConfig,
): Logix.ModuleLogic<FormShape<TValues>, any, never> =>
  module.logic(($) =>
    Effect.gen(function* () {
      const mode: FormValidateMode = config?.mode ?? "onBlur"
      const debounceMs = config?.debounceMs
      const listValidateOnChange = new Set(config?.listValidateOnChange ?? [])

      const validate = (
        trigger: Logix.TraitLifecycle.ValidateMode,
        path: string,
      ): Effect.Effect<void, never, any> =>
        Logix.TraitLifecycle.scopedValidate($, {
          mode: trigger,
          target: (() => {
            const parsed = tryParseSingleIndexFieldPath(path)
            if (!parsed) {
              return Logix.TraitLifecycle.Ref.field(path)
            }
            if (trigger === "valueChange" && listValidateOnChange.has(parsed.listPath)) {
              return Logix.TraitLifecycle.Ref.list(parsed.listPath)
            }
            return Logix.TraitLifecycle.Ref.item(
              parsed.listPath,
              parsed.index,
              parsed.field ? { field: parsed.field } : undefined,
            )
          })(),
        })

      const validateRoot = (): Effect.Effect<void, never, any> =>
        Logix.TraitLifecycle.scopedValidate($, {
          mode: "submit",
          target: Logix.TraitLifecycle.Ref.root(),
        })

      const pending = new Map<string, Fiber.RuntimeFiber<void, never>>()

      const cancelPending = (path: string): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          const prev = pending.get(path)
          if (!prev) return
          pending.delete(path)
          yield* Fiber.interruptFork(prev)
        })

      const scheduleDebouncedValidate = (
        path: string,
      ): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          const ms = debounceMs ?? 0
          if (ms <= 0) {
            yield* validate("valueChange", path)
            return
          }

          yield* cancelPending(path)
          const fiber = yield* Effect.forkScoped(
            Effect.sleep(Duration.millis(ms)).pipe(
              Effect.zipRight(validate("valueChange", path)),
              Effect.ensuring(Effect.sync(() => pending.delete(path))),
              Effect.catchAllCause(() => Effect.void),
            ),
          )
          pending.set(path, fiber)
        })

      const enableOnBlur = mode === "onBlur" || mode === "all"
      const enableOnChange = mode === "onChange" || mode === "all"

      const program = (module as any).__stateTraitProgram as
        | { readonly entries: ReadonlyArray<any> }
        | undefined

      const sources =
        program?.entries?.filter((e) => e && e.kind === "source") ?? []

      const sourceOnMount = sources.filter((e: any) =>
        Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes("onMount") : false,
      )

      const sourceOnValueChange = sources.filter((e: any) =>
        Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes("onValueChange") : false,
      )

      const refreshAffectedSources = (changedPath: string): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          if (!changedPath || isAuxRootPath(changedPath)) return
          if (sourceOnValueChange.length === 0) return

          const changedPattern = toPatternPath(changedPath)

          yield* Effect.forEach(
            sourceOnValueChange,
            (entry: any) => {
              const deps = (entry?.meta?.deps ?? []) as ReadonlyArray<string>
              const affected = deps.some((dep) =>
                isDepAffectedByChange(dep, changedPattern),
              )
              if (!affected) return Effect.void
              return $.traits.source.refresh(entry.fieldPath)
            },
            { concurrency: "unbounded" },
          )
        })

      if (sourceOnMount.length > 0) {
        yield* $.lifecycle.onInit(
          Effect.forEach(
            sourceOnMount,
            (entry: any) => $.traits.source.refresh(entry.fieldPath),
            { concurrency: "unbounded" },
          ).pipe(Effect.asVoid),
        )
      }

      yield* Effect.all(
        [
          enableOnBlur
            ? $.onAction("blur").runFork((action) =>
                Effect.gen(function* () {
                  const path = action.payload.path
                  if (!path || isAuxRootPath(path)) return
                  yield* cancelPending(path)
                  yield* validate("blur", path)
                }),
              )
            : Effect.void,

          enableOnChange
            ? $.onAction("setValue").runFork((action) =>
                Effect.gen(function* () {
                  const path = action.payload.path
                  if (!path || isAuxRootPath(path)) return
                  yield* refreshAffectedSources(path)
                  yield* scheduleDebouncedValidate(path)
                }),
              )
            : Effect.void,

          // submit：总是触发 root validate（即使 mode=onBlur 也应在提交时全量校验）。
          $.onAction("submit").runFork(() =>
            Effect.gen(function* () {
              pending.clear()
              yield* validateRoot()
            }),
          ),

          // 数组结构变更：若影响 source deps，则触发 refresh。
          $.onAction("arrayAppend").runFork((action) => refreshAffectedSources(action.payload.path)),
          $.onAction("arrayPrepend").runFork((action) => refreshAffectedSources(action.payload.path)),
          $.onAction("arrayRemove").runFork((action) => refreshAffectedSources(action.payload.path)),
          $.onAction("arraySwap").runFork((action) => refreshAffectedSources(action.payload.path)),
          $.onAction("arrayMove").runFork((action) => refreshAffectedSources(action.payload.path)),
        ],
        { concurrency: "unbounded" },
      )
    }),
  ) as Logix.ModuleLogic<FormShape<TValues>, any, never>
