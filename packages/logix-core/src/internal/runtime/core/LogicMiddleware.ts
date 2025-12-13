import { Effect, Stream } from 'effect'
import type * as Logix from './module.js'
import * as Platform from './Platform.js'
import type * as TaskRunner from './TaskRunner.js'

// Logic 内核类型与中间件（供 Logic / Bound / Flow 等模块复用）

export type Env<Sh extends Logix.AnyModuleShape, R> = Logix.ModuleTag<Sh> | Platform.Service | R

export type Of<Sh extends Logix.AnyModuleShape, R = never, A = void, E = never> = Effect.Effect<A, E, Env<Sh, R>>

export type Draft<T> = {
  -readonly [K in keyof T]: Draft<T[K]>
}

export type AndThenUpdateHandler<Sh extends Logix.AnyModuleShape, Payload, E = any, R2 = any> = (
  prev: Logix.StateOf<Sh>,
  payload: Payload,
) => Logix.StateOf<Sh> | Effect.Effect<Logix.StateOf<Sh>, E, R2>

export interface IntentBuilder<Payload, Sh extends Logix.AnyModuleShape, R = never> {
  readonly debounce: (ms: number) => IntentBuilder<Payload, Sh, R>
  readonly throttle: (ms: number) => IntentBuilder<Payload, Sh, R>
  readonly filter: (predicate: (value: Payload) => boolean) => IntentBuilder<Payload, Sh, R>
  readonly map: <U>(f: (value: Payload) => U) => IntentBuilder<U, Sh, R>

  readonly run: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
    options?: OperationOptions,
  ) => Of<Sh, R & R2, void, E>

  readonly runParallel: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
    options?: OperationOptions,
  ) => Of<Sh, R & R2, void, E>

  readonly runLatest: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
    options?: OperationOptions,
  ) => Of<Sh, R & R2, void, E>

  readonly runExhaust: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
    options?: OperationOptions,
  ) => Of<Sh, R & R2, void, E>

  /**
   * run*Task：长链路 Task Runner 语法糖（pending → IO → success/failure），自动拆分为多入口多事务。
   *
   * 并发语义分别镜像 run/runLatest/runExhaust/runParallel。
   */
  readonly runTask: <A = void, E = never, R2 = unknown>(
    config: TaskRunner.TaskRunnerConfig<Payload, Sh, R & R2, A, E>,
  ) => Of<Sh, R & R2, void, never>

  readonly runParallelTask: <A = void, E = never, R2 = unknown>(
    config: TaskRunner.TaskRunnerConfig<Payload, Sh, R & R2, A, E>,
  ) => Of<Sh, R & R2, void, never>

  readonly runLatestTask: <A = void, E = never, R2 = unknown>(
    config: TaskRunner.TaskRunnerConfig<Payload, Sh, R & R2, A, E>,
  ) => Of<Sh, R & R2, void, never>

  readonly runExhaustTask: <A = void, E = never, R2 = unknown>(
    config: TaskRunner.TaskRunnerConfig<Payload, Sh, R & R2, A, E>,
  ) => Of<Sh, R & R2, void, never>

  /** Fork a watcher that runs in the ModuleRuntime Scope (equivalent to Effect.forkScoped + run) */
  readonly runFork: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
  ) => Of<Sh, R & R2, void, E>

  /** Fork a watcher with parallel event processing (equivalent to Effect.forkScoped + runParallel) */
  readonly runParallelFork: <A = void, E = never, R2 = unknown>(
    effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
  ) => Of<Sh, R & R2, void, E>

  readonly update: (
    reducer: (
      prev: Logix.StateOf<Sh>,
      payload: Payload,
    ) => Logix.StateOf<Sh> | Effect.Effect<Logix.StateOf<Sh>, any, any>,
  ) => Of<Sh, R, void, never>

  readonly mutate: (reducer: (draft: Draft<Logix.StateOf<Sh>>, payload: Payload) => void) => Of<Sh, R, void, never>

  readonly andThen: {
    <E = never, R2 = never>(handler: AndThenUpdateHandler<Sh, Payload, E, R2>): Of<Sh, R & R2, void, E>

    <A = void, E = never, R2 = never>(
      effect: Of<Sh, R & R2, A, E> | ((p: Payload) => Of<Sh, R & R2, A, E>),
    ): Of<Sh, R & R2, void, E>
  }

  readonly pipe: (
    ...fns: ReadonlyArray<(self: IntentBuilder<Payload, Sh, R>) => IntentBuilder<Payload, Sh, R>>
  ) => IntentBuilder<Payload, Sh, R>

  readonly toStream: () => Stream.Stream<Payload>
}

export interface FluentMatch<V> {
  readonly with: <A>(pattern: (value: V) => boolean, handler: (value: V) => A) => FluentMatch<V>
  readonly otherwise: <A>(handler: (value: V) => A) => A
  /**
   * 强制要求至少匹配一个分支：
   * - 若已有 with 分支命中，则返回该分支的结果（通常是 Effect）；
   * - 若无分支命中，则返回一个失败的 Effect。
   *
   * 约定仅在 handler 返回 Effect 时使用。
   */
  readonly exhaustive: () => Effect.Effect<any, any, any>
}

export interface FluentMatchTag<V extends { _tag: string }> {
  readonly with: <K extends V['_tag'], A>(tag: K, handler: (value: Extract<V, { _tag: K }>) => A) => FluentMatchTag<V>
  readonly otherwise: <A>(handler: (value: V) => A) => A
  readonly exhaustive: () => Effect.Effect<any, any, any>
}

export interface LogicMeta {
  readonly name: string
  readonly storeId?: string
  readonly action?: unknown
  readonly tags?: string[]
  readonly [key: string]: unknown
}

/**
 * OperationOptions：
 * - 用于在触发 Flow/Intent 运行时，为“单次边界操作”附加局部标注；
 * - 只描述意图（例如关闭纯观测能力），不携带规则逻辑本身。
 */
export interface OperationOptions {
  readonly policy?: {
    readonly disableObservers?: boolean
  }
  readonly tags?: ReadonlyArray<string>
  readonly trace?: ReadonlyArray<string>
  readonly meta?: Readonly<Record<string, unknown>>
}

export type Middleware<Sh extends Logix.AnyModuleShape, R, A, E> = (
  effect: Effect.Effect<A, E, Env<Sh, R>>,
  meta: LogicMeta,
) => Effect.Effect<A, E, Env<Sh, R>>
