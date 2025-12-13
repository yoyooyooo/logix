import * as Logix from '@logix/core'
import { Effect, Stream } from 'effect'
import { clearDevtoolsEvents, DevtoolsSnapshotStore } from '../snapshot.js'
import { computeDevtoolsState } from './compute.js'
import type { DevtoolsState } from './model.js'
import { persistLayoutToStorage } from './storage.js'
import { DevtoolsModule } from './module.js'

// Helper to create a stream from DOM events
const fromDomEvent = <K extends keyof WindowEventMap>(event: K): Stream.Stream<WindowEventMap[K]> =>
  Stream.async<WindowEventMap[K]>((emit) => {
    const handler = (e: WindowEventMap[K]) => emit.single(e)
    window.addEventListener(event, handler)
    return Effect.sync(() => window.removeEventListener(event, handler))
  })

export const DevtoolsLogic = DevtoolsModule.logic<DevtoolsSnapshotStore>(($) => ({
  // setup 段暂不做任何工作，所有初始化与 watcher 注册均放在 run 段，
  // 避免触发「setup 阶段禁止使用 Lifecycle / Flow API」的约束。
  setup: Effect.void,

  // run 段：初始化 snapshot 订阅 + 注册所有 onAction watcher 与拖拽逻辑。
  run: Effect.gen(function* () {
    const snapshotStore = yield* DevtoolsSnapshotStore

    // 初始化：同步一次当前 snapshot
    yield* $.lifecycle.onInit(
      Effect.gen(function* () {
        const initialSnapshot = yield* snapshotStore.get
        yield* $.state.update((prev) =>
          computeDevtoolsState(prev as DevtoolsState | undefined, initialSnapshot, {
            userSelectedEvent: false,
          }),
        )
      }),
    )

    // 订阅 Snapshot 变化：每次 Snapshot 更新时重算 DevtoolsState
    yield* $.on(snapshotStore.changes).runFork((snapshot) =>
      $.state.update((prev) =>
        computeDevtoolsState(prev as DevtoolsState | undefined, snapshot, {
          userSelectedEvent: false,
        }),
      ),
    )

    // 拖拽逻辑
    yield* $.onAction('resizeStart').runFork((action) =>
      Effect.gen(function* () {
        const edge = action.payload.edge

        // Signal dragging started：仅更新 layout.isDragging，不重新计算 Snapshot 衍生视图。
        yield* $.state.update((prev) => {
          const current = prev as DevtoolsState
          return {
            ...current,
            layout: {
              ...current.layout,
              isDragging: true,
            },
          }
        })

        const dragStream = fromDomEvent('mousemove').pipe(
          Stream.interruptWhen(
            Effect.race(
              fromDomEvent('mouseup').pipe(Stream.runHead),
              // Safety fallback
              Effect.never,
            ),
          ),
          Stream.tap((e) => {
            return $.state.update((prev) => {
              const current = prev as DevtoolsState
              const { height, marginLeft, marginRight } = current.layout
              const winH = window.innerHeight
              const winW = window.innerWidth

              let nextHeight = height
              let nextMarginLeft = marginLeft
              let nextMarginRight = marginRight

              if (edge === 'top') {
                const newHeight = winH - e.clientY - 16 // 16px bottom margin
                nextHeight = Math.max(200, Math.min(newHeight, winH - 100))
              } else if (edge === 'left') {
                const newMarginLeft = Math.max(16, e.clientX)
                const currentWidth = winW - newMarginLeft - marginRight
                if (currentWidth >= 300) {
                  nextMarginLeft = newMarginLeft
                }
              } else if (edge === 'right') {
                const newMarginRight = Math.max(16, winW - e.clientX)
                const currentWidth = winW - marginLeft - newMarginRight
                if (currentWidth >= 300) {
                  nextMarginRight = newMarginRight
                }
              }

              return {
                ...current,
                layout: {
                  ...current.layout,
                  height: nextHeight,
                  marginLeft: nextMarginLeft,
                  marginRight: nextMarginRight,
                  isDragging: true,
                },
              }
            })
          }),
          Stream.runDrain,
        )

        yield* dragStream

        // Finished dragging：仅落盘 layout 结果。
        yield* $.state.update((prev) => {
          const current = prev as DevtoolsState
          const next: DevtoolsState = {
            ...current,
            layout: {
              ...current.layout,
              isDragging: false,
            },
          }
          persistLayoutToStorage(next.layout)
          return next
        })
      }),
    )

    // 行为逻辑：仅保留具有副作用的 clearEvents，纯状态更新通过 Primary Reducer 处理。
    yield* $.onAction('clearEvents').runFork(() =>
      Effect.sync(() => {
        clearDevtoolsEvents()
      }),
    )

    // 时间旅行：在 Devtools 侧触发 Runtime.applyTransactionSnapshot。
    yield* $.onAction('timeTravelBefore').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
          txnId: string
        }
        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, payload.txnId, 'before')
      }),
    )

    yield* $.onAction('timeTravelAfter').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
          txnId: string
        }
        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, payload.txnId, 'after')
      }),
    )

    yield* $.onAction('timeTravelLatest').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
        }

        const snapshot = yield* snapshotStore.get
        let baseTxnId: string | undefined

        for (const event of snapshot.events) {
          if (event.type !== 'state:update') continue
          const anyEvent = event as any
          if (anyEvent.moduleId !== payload.moduleId) continue
          if (anyEvent.runtimeId !== payload.instanceId) continue
          const txnId = anyEvent.txnId as string | undefined
          if (!txnId) continue
          const originKind = anyEvent.originKind as string | undefined
          // 仅使用非 devtools 事务作为“最新业务状态”的基准
          if (originKind === 'devtools') continue
          baseTxnId = txnId
        }

        if (!baseTxnId) {
          return
        }

        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, baseTxnId, 'after')
      }),
    )
  }),
}))

