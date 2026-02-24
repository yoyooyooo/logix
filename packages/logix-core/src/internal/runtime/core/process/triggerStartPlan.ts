import type { ProcessDefinition, ProcessTrigger } from './protocol.js'
import type { NonPlatformTriggerSpec } from './triggerStreams.js'

export const PROCESS_RUNTIME_BOOT_EVENT = 'runtime:boot' as const

export type ProcessTriggerStartPlan = {
  readonly nonPlatformTriggers: ReadonlyArray<NonPlatformTriggerSpec>
  readonly bootTrigger?: Extract<ProcessTrigger, { readonly kind: 'platformEvent' }>
  readonly dependencyModuleIds: ReadonlyArray<string>
  readonly dispatchTracingModuleIds: ReadonlyArray<string>
}

const appendUniqueModuleId = (ids: string[], seen: Set<string>, moduleId: string | undefined): void => {
  if (typeof moduleId !== 'string' || moduleId.length === 0 || seen.has(moduleId)) {
    return
  }
  seen.add(moduleId)
  ids.push(moduleId)
}

export const compileProcessTriggerStartPlan = (definition: ProcessDefinition): ProcessTriggerStartPlan => {
  const nonPlatformTriggers: NonPlatformTriggerSpec[] = []

  let bootTrigger: ProcessTriggerStartPlan['bootTrigger'] = undefined

  const implicitModuleIds: string[] = []
  const implicitSeen = new Set<string>()

  for (const trigger of definition.triggers) {
    switch (trigger.kind) {
      case 'platformEvent': {
        if (!bootTrigger && trigger.platformEvent === PROCESS_RUNTIME_BOOT_EVENT) {
          bootTrigger = {
            kind: 'platformEvent',
            name: trigger.name,
            platformEvent: PROCESS_RUNTIME_BOOT_EVENT,
          }
        }
        break
      }
      case 'timer': {
        nonPlatformTriggers.push(trigger)
        break
      }
      case 'moduleAction': {
        nonPlatformTriggers.push(trigger)
        appendUniqueModuleId(implicitModuleIds, implicitSeen, trigger.moduleId)
        break
      }
      case 'moduleStateChange': {
        nonPlatformTriggers.push(trigger)
        appendUniqueModuleId(implicitModuleIds, implicitSeen, trigger.moduleId)
        break
      }
      default: {
        // Keep malformed trigger kinds in the non-platform stream path so runtime preserves
        // existing process::invalid_trigger_kind error semantics.
        nonPlatformTriggers.push(trigger as NonPlatformTriggerSpec)
        break
      }
    }
  }

  const dispatchTracingModuleIds: string[] = []
  const dispatchSeen = new Set<string>()
  for (const moduleId of definition.requires ?? []) {
    appendUniqueModuleId(dispatchTracingModuleIds, dispatchSeen, moduleId)
  }

  const dependencyModuleIds = dispatchTracingModuleIds.slice()
  const dependencySeen = new Set(dependencyModuleIds)
  for (const moduleId of implicitModuleIds) {
    appendUniqueModuleId(dependencyModuleIds, dependencySeen, moduleId)
  }

  return {
    nonPlatformTriggers,
    bootTrigger,
    dependencyModuleIds,
    dispatchTracingModuleIds,
  }
}
