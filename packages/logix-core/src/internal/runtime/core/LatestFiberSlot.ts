import { Fiber, Ref } from 'effect'

export type LatestFiberSlotState = {
  fiber: Fiber.RuntimeFiber<void, never> | undefined
  runningId: number
  nextId: number
}

export const make = () =>
  Ref.make<LatestFiberSlotState>({
    fiber: undefined,
    runningId: 0,
    nextId: 0,
  })

export const beginRun = (slotRef: Ref.Ref<LatestFiberSlotState>) =>
  Ref.modify(slotRef, (state) => {
    const runId = state.nextId + 1
    const prevFiber = state.fiber
    const prevRunningId = state.runningId
    state.nextId = runId
    state.runningId = runId
    return [[prevFiber, prevRunningId, runId] as const, state] as const
  })

export const setFiberIfCurrent = (
  slotRef: Ref.Ref<LatestFiberSlotState>,
  runId: number,
  fiber: Fiber.RuntimeFiber<void, never>,
) =>
  Ref.update(slotRef, (state) => {
    if (state.runningId === runId) {
      state.fiber = fiber
    }
    return state
  })

export const clearIfCurrent = (slotRef: Ref.Ref<LatestFiberSlotState>, runId: number) =>
  Ref.update(slotRef, (state) => {
    if (state.runningId === runId) {
      state.runningId = 0
      state.fiber = undefined
    }
    return state
  })
