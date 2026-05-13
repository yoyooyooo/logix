/**
 * @scenario Fluent Intent · Action → State 表单脏标记示例
 * @description
 *   演示如何通过 Fluent DSL（`$.onAction + $.state.update`）
 *   表达典型的「Action → State」规则：
 *     - input/change 带 payload 更新 value，并标记 isDirty = true；
 *     - input/reset 将表单重置为初始状态，并清空 isDirty。
 */

import { Effect, Schema, Stream } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'

// ---------------------------------------------------------------------------
// Schema → Shape：带脏标记的简单表单 State / Action
// ---------------------------------------------------------------------------

const DirtyFormStateSchema = Schema.Struct({
  value: Schema.String,
  isDirty: Schema.Boolean,
})

const DirtyFormActionMap = {
  'input/change': Schema.String,
  'input/reset': Schema.Void,
}

export type DirtyFormShape = Logix.Module.Shape<typeof DirtyFormStateSchema, typeof DirtyFormActionMap>
export type DirtyFormState = Logix.Module.StateOf<DirtyFormShape>
export type DirtyFormAction = Logix.Module.ActionOf<DirtyFormShape>

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义表单模块
// ---------------------------------------------------------------------------

export const Form = Logix.Module.make('FormModule', {
  state: DirtyFormStateSchema,
  actions: DirtyFormActionMap,
})

// ---------------------------------------------------------------------------
// Logic：使用 Fluent DSL 表达「事件 → 状态更新」意图（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const FormLogic = Form.logic('form-logic', ($) =>
  Effect.gen(function* () {
    // 在 run 段挂载 watcher，避免 setup 阶段触发 Phase Guard
    yield* Effect.all(
      [
        // 监听 input/change，更新 value 并标记为脏
        $.onAction('input/change').run((action) =>
          $.state.update((prev) => ({
            ...prev,
            value: action.payload,
            isDirty: true,
          })),
        ),

        // 监听 input/reset，重置 value 和 isDirty
        $.onAction('input/reset').run(() =>
          $.state.update(() => ({
            value: '',
            isDirty: false,
          })),
        ),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

// ---------------------------------------------------------------------------
// Program / Layer：组合初始 State 与 Logic，生成 canonical 公开装配对象
// ---------------------------------------------------------------------------

export const DirtyFormProgram = Logix.Program.make(Form, {
  initial: {
    value: '',
    isDirty: false,
  },
  logics: [FormLogic],
})

export const DirtyFormLayer = programLayer(DirtyFormProgram)

// ---------------------------------------------------------------------------
// Demo: Simulation
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const program = Effect.gen(function* () {
    const runtime = yield* Effect.service(Form.tag).pipe(Effect.orDie)

    // Log state changes
    yield* Effect.forkChild(
      runtime
        .changes((s) => s)
        .pipe(Stream.runForEach((s) => Effect.log(`[State] value="${s.value}", isDirty=${s.isDirty}`))),
    )

    yield* Effect.log('--- Start ---')

    yield* Effect.log('Dispatching input/change "hello"...')
    yield* runtime.dispatch({ _tag: 'input/change', payload: 'hello' })
    yield* Effect.sleep(10)

    yield* Effect.log('Dispatching input/change "world"...')
    yield* runtime.dispatch({ _tag: 'input/change', payload: 'world' })
    yield* Effect.sleep(10)

    yield* Effect.log('Dispatching input/reset...')
    yield* runtime.dispatch({ _tag: 'input/reset', payload: undefined })
    yield* Effect.sleep(10)

    yield* Effect.log('--- End ---')
  })

  void Effect.runPromise(program.pipe(Effect.provide(DirtyFormLayer)) as Effect.Effect<void, never, never>)
}
