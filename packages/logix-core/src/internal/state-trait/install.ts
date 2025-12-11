import { Effect, Option } from "effect"
import * as EffectOp from "../../effectop.js"
import type { BoundApi } from "../runtime/core/module.js"
import * as EffectOpCore from "../runtime/EffectOpCore.js"
import type {
  StateTraitProgram,
  StateTraitPlanStep,
  StateTraitEntry,
  StateTraitSpec,
} from "./model.js"

/**
 * 简单的路径工具：
 * - getAtPath：从嵌套对象读取指定路径的值；
 * - setAtPathMutating：在可变对象上就地写入路径对应的值。
 *
 * 说明：
 * - 仅用于 StateTrait.install 内部，与项目其他路径工具解耦；
 * - 首版不支持数组/Map 等复杂结构，后续可按 data-model.md 补充。
 */
const getAtPath = (state: any, path: string): any => {
  if (path === "" || state == null) return state
  const segments = path.split(".")
  let current: any = state
  for (let i = 0; i < segments.length; i++) {
    if (current == null) return undefined
    current = current[segments[i]]
  }
  return current
}

const setAtPathMutating = (draft: any, path: string, value: any): void => {
  if (!path) {
    return
  }
  const segments = path.split(".")
  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]
    const next = current[key]
    if (next == null || typeof next !== "object") {
      current[key] = {}
    }
    current = current[key]
  }
  current[segments[segments.length - 1]] = value
}

const buildEntryIndex = <S>(
  spec: StateTraitSpec<S>,
): Map<string, StateTraitEntry<S, string>> => {
  const index = new Map<string, StateTraitEntry<S, string>>()
  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const entry = spec[key as keyof typeof spec] as
      | StateTraitEntry<S, string>
      | undefined
    if (!entry) continue
    const fieldPath = (entry as any).fieldPath ?? key
    index.set(fieldPath, {
      ...(entry as any),
      fieldPath,
    })
  }
  return index
}

const getModuleId = (bound: BoundApi<any, any>): string | undefined =>
  (bound as any).__moduleId as string | undefined

const getMiddlewareStack = (): Effect.Effect<
  EffectOp.MiddlewareStack,
  never,
  any
> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) =>
      Option.isSome(maybe) ? maybe.value.stack : [],
    ),
  )

const installComputed = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: StateTraitEntry<S, string>,
): Effect.Effect<void, never, any> => {
  if (!step.targetFieldPath) {
    return Effect.void
  }

  if (entry.kind !== "computed") {
    return Effect.void
  }

  const moduleId = getModuleId(bound)

  // 监听完整 State 的变化，在每次变化时通过 EffectOp 总线重算目标字段。
  // - 首版实现依旧基于 onState(s => s)，后续可按 Graph.deps 收窄触发范围。
  return bound
    .onState((s: any) => s)
    .run((state: any) =>
      Effect.gen(function* () {
        const stack = yield* getMiddlewareStack()

        const effect = bound.state.mutate((draft: any) => {
          const next = (entry.meta as any).derive(state)
          setAtPathMutating(
            draft,
            step.targetFieldPath as string,
            next,
          )
        }) as Effect.Effect<void, never, any>

        const op = EffectOp.make({
          kind: "state",
          name: "computed:update",
          effect,
          meta: {
            moduleId,
            fieldPath: step.targetFieldPath,
            deps: step.sourceFieldPaths,
          },
        })

        return yield* EffectOp.run(op, stack)
      }),
    ) as any
}

const installLink = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: StateTraitEntry<S, string>,
): Effect.Effect<void, never, any> => {
  if (!step.targetFieldPath) {
    return Effect.void
  }

  if (entry.kind !== "link") {
    return Effect.void
  }

  const sourcePath = entry.meta.from as string
  const moduleId = getModuleId(bound)

  // 当源字段发生变化时，通过 EffectOp 总线同步目标字段的值。
  return bound
    .onState((s: any) => getAtPath(s, sourcePath))
    .run((value: any) =>
      Effect.gen(function* () {
        const stack = yield* getMiddlewareStack()

        const effect = bound.state.mutate((draft: any) => {
          setAtPathMutating(
            draft,
            step.targetFieldPath as string,
            value,
          )
        }) as Effect.Effect<void, never, any>

        const op = EffectOp.make({
          kind: "state",
          name: "link:propagate",
          effect,
          meta: {
            moduleId,
            from: sourcePath,
            to: step.targetFieldPath,
          },
        })

        return yield* EffectOp.run(op, stack)
      }),
    ) as any
}

const installSource = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: StateTraitEntry<S, string>,
): Effect.Effect<void, never, any> => {
  if (!step.targetFieldPath) {
    return Effect.void
  }

  if (entry.kind !== "source" || !step.resourceId) {
    return Effect.void
  }

  const fieldPath = step.targetFieldPath
  const resourceId = step.resourceId
  const moduleId = getModuleId(bound)

  // 仅供内部使用：由 BoundApiRuntime 暴露的刷新注册入口。
  const register = (bound as any)
    .__registerSourceRefresh as
    | ((
        field: string,
        handler: (state: any) => Effect.Effect<void, never, any>,
      ) => void)
    | undefined

  if (!register) {
    // 当前 Bound 实现未提供 source 刷新入口，直接跳过安装。
    return Effect.void
  }

  register(fieldPath, (state: any) =>
    Effect.gen(function* () {
      const stack = yield* getMiddlewareStack()

      const key = (entry.meta as any).key(state)

      const op = EffectOp.make<any, any, any>({
        kind: "service",
        name: resourceId,
        effect: Effect.void as Effect.Effect<any, any, any>,
        meta: {
          moduleId,
          fieldPath,
          resourceId,
          key,
        },
      })

      // 通过 MiddlewareStack 执行资源访问逻辑：
      // - 默认由 Resource/Query 中间件决定是直接调用 ResourceSpec.load 还是交给 QueryClient；
      // - 在本层吞掉业务错误，确保刷新入口对调用方表现为 E = never。
      const resultEffect = EffectOp.run(op, stack).pipe(
        Effect.catchAll(() => Effect.succeed(undefined as any)),
      )
      const result: any = yield* resultEffect

      const updateEffect = bound.state.mutate((draft: any) => {
        setAtPathMutating(draft, fieldPath, result)
      }) as Effect.Effect<void, never, any>

      return yield* updateEffect
    }),
  )

  // register 只是把刷新逻辑挂到 Bound API 上，本身不需要长生命周期 Fiber。
  return Effect.void
}

/**
 * 在给定 Bound API 上安装 StateTraitProgram 描述的行为。
 *
 * - Phase 2 最小实现：
 *   - 为 computed 字段注册 watcher：当 State 变化时重算目标字段；
 *   - 为 link 字段注册 watcher：当源字段变化时同步目标字段；
 *   - 为 source 字段预留刷新入口（暂不触发外部调用）。
 *
 * 说明：
 * - 所有 watcher 都通过 Bound API `$` 安装，不直接依赖 ModuleRuntime；
 * - 每个 PlanStep 对应一个长生命周期 Effect，通过 forkScoped 挂载到 Runtime Scope。
 */
export const install = <S>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => {
  const entryIndex = buildEntryIndex(program.spec)

  const installStep = (
    step: StateTraitPlanStep,
  ): Effect.Effect<void, never, any> => {
    if (!step.targetFieldPath) {
      return Effect.void
    }

    const entry = entryIndex.get(step.targetFieldPath)
    if (!entry) {
      // Plan 中引用了不存在的 Spec：视为构建阶段的 bug，这里直接忽略该步骤。
      return Effect.void
    }

    switch (step.kind) {
      case "computed-update":
        return installComputed(bound, step, entry)
      case "link-propagate":
        return installLink(bound, step, entry)
      case "source-refresh":
        return installSource(bound, step, entry)
      default:
        return Effect.void
    }
  }

  return Effect.forEach(
    program.plan.steps,
    (step) => Effect.forkScoped(installStep(step)) as Effect.Effect<void, never, any>,
  ).pipe(Effect.asVoid)
}
