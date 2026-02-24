import { describe, it, expect } from '@effect/vitest'
import type { ProcessDefinition } from '../../src/internal/runtime/core/process/protocol.js'
import {
  PROCESS_RUNTIME_BOOT_EVENT,
  compileProcessTriggerStartPlan,
} from '../../src/internal/runtime/core/process/triggerStartPlan.js'

describe('process: trigger start plan', () => {
  it('should compile boot/non-platform triggers and dedup requires once', () => {
    const moduleActionA = {
      kind: 'moduleAction',
      name: 'action-a',
      moduleId: 'module-b',
      actionId: 'ping',
    } as const
    const moduleStateChange = {
      kind: 'moduleStateChange',
      name: 'state-c',
      moduleId: 'module-c',
      path: 'user.name',
    } as const
    const timer = {
      kind: 'timer',
      name: 'tick',
      timerId: '10 millis',
    } as const
    const moduleActionB = {
      kind: 'moduleAction',
      name: 'action-b',
      moduleId: 'module-c',
      actionId: 'pong',
    } as const

    const definition = {
      processId: 'ProcessTriggerStartPlanCompiler',
      requires: ['module-a', '', 'module-b', 'module-a', 'module-b'],
      triggers: [
        { kind: 'platformEvent', name: 'ready', platformEvent: 'app:ready' },
        moduleActionA,
        moduleStateChange,
        timer,
        { kind: 'platformEvent', name: 'boot-first', platformEvent: PROCESS_RUNTIME_BOOT_EVENT },
        moduleActionB,
        { kind: 'platformEvent', name: 'boot-second', platformEvent: PROCESS_RUNTIME_BOOT_EVENT },
      ],
      concurrency: { mode: 'serial', maxQueue: 16 },
      errorPolicy: { mode: 'failStop' },
      diagnosticsLevel: 'light',
    } satisfies ProcessDefinition

    const plan = compileProcessTriggerStartPlan(definition)

    expect(plan.bootTrigger).toEqual({
      kind: 'platformEvent',
      name: 'boot-first',
      platformEvent: PROCESS_RUNTIME_BOOT_EVENT,
    })
    expect(plan.nonPlatformTriggers).toEqual([moduleActionA, moduleStateChange, timer, moduleActionB])
    expect(plan.dispatchTracingModuleIds).toEqual(['module-a', 'module-b'])
    expect(plan.dependencyModuleIds).toEqual(['module-a', 'module-b', 'module-c'])
  })

  it('should keep boot trigger empty when runtime:boot is not declared', () => {
    const definition = {
      processId: 'ProcessTriggerStartPlanNoBoot',
      requires: ['module-a', 'module-a'],
      triggers: [
        { kind: 'platformEvent', name: 'ready', platformEvent: 'app:ready' },
        { kind: 'timer', timerId: '1 second' },
      ],
      concurrency: { mode: 'serial', maxQueue: 16 },
      errorPolicy: { mode: 'failStop' },
      diagnosticsLevel: 'light',
    } satisfies ProcessDefinition

    const plan = compileProcessTriggerStartPlan(definition)

    expect(plan.bootTrigger).toBeUndefined()
    expect(plan.nonPlatformTriggers).toEqual([{ kind: 'timer', timerId: '1 second' }])
    expect(plan.dispatchTracingModuleIds).toEqual(['module-a'])
    expect(plan.dependencyModuleIds).toEqual(['module-a'])
  })
})
