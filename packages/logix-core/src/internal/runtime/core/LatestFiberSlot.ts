import { Fiber, Ref } from 'effect'

export type LatestFiberSlotState<E = never> = {
  fiber: Fiber.RuntimeFiber<void, E> | undefined
  runningId: number
  nextId: number
}

export const make = <E = never>() =>
  Ref.make<LatestFiberSlotState<E>>({
    fiber: undefined,
    runningId: 0,
    nextId: 0,
  })

export const beginRun = <E>(slotRef: Ref.Ref<LatestFiberSlotState<E>>) =>
  Ref.modify(slotRef, (state) => {
    const runId = state.nextId + 1
    const prevFiber = state.fiber
    const prevRunningId = state.runningId
    state.nextId = runId
    state.runningId = runId
    return [[prevFiber, prevRunningId, runId] as const, state] as const
  })

export const setFiberIfCurrent = <E>(
  slotRef: Ref.Ref<LatestFiberSlotState<E>>,
  runId: number,
  fiber: Fiber.RuntimeFiber<void, E>,
) =>
  Ref.update(slotRef, (state) => {
    if (state.runningId === runId) {
      state.fiber = fiber
    }
    return state
  })

export const clearIfCurrent = <E>(slotRef: Ref.Ref<LatestFiberSlotState<E>>, runId: number) =>
  Ref.update(slotRef, (state) => {
    if (state.runningId === runId) {
      state.runningId = 0
      state.fiber = undefined
    }
    return state
  })
