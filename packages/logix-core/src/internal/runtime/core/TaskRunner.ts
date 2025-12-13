import { Cause, Effect, Fiber, FiberRef, Ref, Stream } from "effect"
import * as Debug from "./DebugSink.js"
import { isDevEnv } from "./env.js"
import type * as Logic from "./LogicMiddleware.js"
import type { AnyModuleShape } from "./module.js"
import type { StateTxnOrigin } from "./StateTransaction.js"

/**
 * 用于防止在「同步事务执行 fiber」内调用 run*Task（会导致事务队列等待自身而死锁）。
 *
 * - ModuleRuntime 在执行每个事务（dispatch/source-refresh/devtools/...）时，会 locally 标记为 true。
 * - run*Task 在启动时检查该标记：若为 true，则仅在 dev/test 下发出 diagnostic 并直接 no-op。
 */
export const inSyncTransactionFiber = FiberRef.unsafeMake(false)

export type TaskRunnerMode =
  | "task" // sequential
  | "parallel"
  | "latest"
  | "exhaust"

export type TaskStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "interrupted"

export interface TaskExecution {
  readonly taskId: number
  readonly status: TaskStatus
  readonly acceptedAt: number
  readonly startedAt?: number
  readonly endedAt?: number
}

export interface TaskRunnerOrigins {
  readonly pending?: StateTxnOrigin
  readonly success?: StateTxnOrigin
  readonly failure?: StateTxnOrigin
}

type TaskHandler<Payload, Sh extends AnyModuleShape, R> =
  | Logic.Of<Sh, R, void, never>
  | ((payload: Payload) => Logic.Of<Sh, R, void, never>)

type TaskEffect<Payload, Sh extends AnyModuleShape, R, A, E> =
  | Logic.Of<Sh, R, A, E>
  | ((payload: Payload) => Logic.Of<Sh, R, A, E>)

export interface TaskRunnerConfig<
  Payload,
  Sh extends AnyModuleShape,
  R,
  A = void,
  E = never,
> {
  /**
   * 可选：触发源名称（例如 actionTag / fieldPath），用于默认 pending origin.name。
   * - BoundApiRuntime 在 onAction("xxx") / traits.source.refresh("field") 等场景可填充；
   * - 其他场景不强求。
   */
  readonly triggerName?: string

  /**
   * pending：同步状态写入（loading=true / 清理错误等），始终作为独立事务入口。
   * - 仅对“被接受并实际启动的 task”执行（runExhaustTask 忽略的触发不执行）。
   */
  readonly pending?: TaskHandler<Payload, Sh, R>

  /**
   * effect：真实 IO / 异步任务（必须运行在事务窗口之外）。
   */
  readonly effect: TaskEffect<Payload, Sh, R, A, E>

  /**
   * success：成功写回（独立事务入口）。
   */
  readonly success?: (result: A, payload: Payload) => Logic.Of<Sh, R, void, never>

  /**
   * failure：失败写回（独立事务入口）。
   *
   * 说明：传入 Cause 以保留 defect/interrupt 等语义；中断（interrupt）默认不触发 failure 写回。
   */
  readonly failure?: (cause: Cause.Cause<E>, payload: Payload) => Logic.Of<Sh, R, void, never>

  /**
   * origin：可选覆写三笔事务的 origin。
   * - 默认：pending.kind="task:pending"；success/failure.kind="service-callback"。
   */
  readonly origin?: TaskRunnerOrigins

  /**
   * priority：预留字段，仅用于未来调试/排序，不改变事务边界与并发语义。
   */
  readonly priority?: number
}

export interface TaskRunnerRuntime {
  readonly moduleId?: string
  readonly runWithStateTransaction: (
    origin: StateTxnOrigin,
    body: () => Effect.Effect<void, never, any>,
  ) => Effect.Effect<void, never, any>
}

const resolve = <Payload, Sh extends AnyModuleShape, R, A, E>(
  eff: TaskEffect<Payload, Sh, R, A, E> | TaskHandler<Payload, Sh, R>,
  payload: Payload,
): any => (typeof eff === "function" ? (eff as any)(payload) : eff)

const defaultOrigins = (
  triggerName: string | undefined,
): Required<TaskRunnerOrigins> => ({
  pending: {
    kind: "task:pending",
    name: triggerName,
  },
  success: {
    kind: "service-callback",
    name: "task:success",
  },
  failure: {
    kind: "service-callback",
    name: "task:failure",
  },
})

const emitInvalidUsageDiagnostic = (
  moduleId: string | undefined,
): Effect.Effect<void> =>
  Debug.record({
    type: "diagnostic",
    moduleId,
    code: "logic::invalid_usage",
    severity: "error",
    message:
      "run*Task is not allowed inside a synchronous StateTransaction body (it may deadlock the txnQueue).",
    hint:
      "请将 run*Task 放到 $.onAction/$.onState/$.on 等 watcher 的 run 段；" +
      "不要在 reducer / trait.run / 单笔事务的同步 body 内直接调用。若需要长链路，请用多入口（pending→IO→writeback）模式。",
    kind: "run_task_in_transaction",
  })

const shouldNoopDueToSyncTxn = (
  runtime: TaskRunnerRuntime,
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const inTxn = yield* FiberRef.get(inSyncTransactionFiber)
    if (!inTxn) {
      return false
    }
    // 无论环境如何，都必须 no-op（否则可能死锁）；diagnostic 仅在 dev/test 下发出。
    if (isDevEnv()) {
      yield* emitInvalidUsageDiagnostic(runtime.moduleId)
    }
    return true
  })

const runTaskLifecycle = <Payload, Sh extends AnyModuleShape, R, A, E>(
  payload: Payload,
  runtime: TaskRunnerRuntime,
  config: TaskRunnerConfig<Payload, Sh, R, A, E>,
  getCanWriteBack?: Effect.Effect<boolean>,
): Effect.Effect<void, never, Logic.Env<Sh, R>> =>
  Effect.gen(function* () {
    const noop = yield* shouldNoopDueToSyncTxn(runtime)
    if (noop) {
      return
    }

    const defaults = defaultOrigins(config.triggerName)
    const origins: Required<TaskRunnerOrigins> = {
      pending: config.origin?.pending ?? defaults.pending,
      success: config.origin?.success ?? defaults.success,
      failure: config.origin?.failure ?? defaults.failure,
    }

    // 1) pending：作为独立事务入口，且一旦开始就不应被 runLatest 的 interrupt 打断
    const pending = config.pending
    if (pending) {
      yield* Effect.uninterruptible(
        runtime.runWithStateTransaction(origins.pending, () =>
          Effect.asVoid(resolve(pending, payload)),
        ),
      )
    }

    // 2) IO：在事务窗口之外运行
    const io = resolve(config.effect, payload) as Effect.Effect<A, E, Logic.Env<Sh, R>>
    const exit = yield* Effect.exit(io)

    // 3) 写回：需要通过 guard 确认仍为当前 task（runLatestTask）
    if (getCanWriteBack) {
      const ok = yield* getCanWriteBack
      if (!ok) {
        return
      }
    }

    if (exit._tag === "Success") {
      const success = config.success
      if (success) {
        yield* runtime.runWithStateTransaction(origins.success, () =>
          Effect.asVoid(success(exit.value, payload)),
        )
      }
      return
    }

    // Failure：中断不触发 failure 写回（例如 runLatestTask 的取消、Scope 结束）。
    const cause = exit.cause as Cause.Cause<E>
    if (Cause.isInterrupted(cause)) {
      return
    }

    const failure = config.failure
    if (failure) {
      yield* runtime.runWithStateTransaction(origins.failure, () =>
        Effect.asVoid(failure(cause, payload)),
      )
    }
  }).pipe(
    // watcher 不应因单次 task 出错而整体崩溃：吞掉错误并记录日志
    Effect.catchAllCause((cause) => Effect.logError("TaskRunner error", cause)),
  ) as Effect.Effect<void, never, Logic.Env<Sh, R>>

/**
 * makeTaskRunner：
 * - 复用 FlowRuntime 的并发语义（sequential/parallel/latest/exhaust）；
 * - 将单次触发拆分为：pending(独立事务) → IO → success/failure(独立事务)。
 */
export const makeTaskRunner = <
  Payload,
  Sh extends AnyModuleShape,
  R,
  A = void,
  E = never,
>(
  stream: Stream.Stream<Payload>,
  mode: TaskRunnerMode,
  runtime: TaskRunnerRuntime,
  config: TaskRunnerConfig<Payload, Sh, R, A, E>,
): Effect.Effect<void, never, Logic.Env<Sh, R>> => {
  if (mode === "latest") {
    return Effect.gen(function* () {
      const taskIdRef = yield* Ref.make(0)
      const currentFiberRef = yield* Ref.make<Fiber.RuntimeFiber<void, never> | undefined>(
        undefined,
      )

      const start = (payload: Payload) =>
        Effect.gen(function* () {
          const taskId = yield* Ref.updateAndGet(taskIdRef, (n) => n + 1)

          const prev = yield* Ref.get(currentFiberRef)
          if (prev) {
            // 不等待旧 fiber 真正结束，避免阻塞新触发；写回阶段靠 taskId guard 兜底。
            yield* Fiber.interruptFork(prev)
          }

          const canWriteBack = Ref.get(taskIdRef).pipe(
            Effect.map((current) => current === taskId),
          )

          const fiber = yield* Effect.fork(
            runTaskLifecycle<Payload, Sh, R, A, E>(
              payload,
              runtime,
              config,
              canWriteBack,
            ),
          )

          yield* Ref.set(currentFiberRef, fiber)
        })

      return yield* Stream.runForEach(stream, start)
    })
  }

  if (mode === "exhaust") {
    return Effect.gen(function* () {
      const busyRef = yield* Ref.make(false)

      const mapper = (payload: Payload) =>
        Effect.gen(function* () {
          const acquired = yield* Ref.modify(busyRef, (busy) =>
            busy ? ([false, busy] as const) : ([true, true] as const),
          )
          if (!acquired) {
            // 忽略触发：不产生 pending 事务
            return
          }
          try {
            yield* runTaskLifecycle<Payload, Sh, R, A, E>(
              payload,
              runtime,
              config,
            )
          } finally {
            yield* Ref.set(busyRef, false)
          }
        })

      return yield* Stream.runDrain(
        stream.pipe(Stream.mapEffect(mapper, { concurrency: "unbounded" })),
      )
    })
  }

  if (mode === "parallel") {
    return Stream.runDrain(
      stream.pipe(
        Stream.mapEffect(
          (payload) =>
            runTaskLifecycle<Payload, Sh, R, A, E>(
              payload,
              runtime,
              config,
            ),
          { concurrency: "unbounded" },
        ),
      ),
    ) as Effect.Effect<void, never, Logic.Env<Sh, R>>
  }

  // mode === "task"（sequential）
  return Stream.runForEach(stream, (payload) =>
    runTaskLifecycle<Payload, Sh, R, A, E>(payload, runtime, config),
  ) as Effect.Effect<void, never, Logic.Env<Sh, R>>
}
