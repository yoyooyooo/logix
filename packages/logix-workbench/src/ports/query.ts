import type { ModulePortSpecPayload, TypeIrPayload } from './types.js'
import { isModulePortSpecPayload, isTypeIrPayload } from './types.js'

export type ReferenceSpaceKeys = {
  readonly moduleId: string
  readonly actions: ReadonlyArray<string>
  readonly events: ReadonlyArray<string>
  readonly outputs: ReadonlyArray<string>
  readonly exports: ReadonlyArray<string>
}

export type TypeIrAvailability = 'present' | 'truncated' | 'missing' | 'invalid' | 'moduleId_mismatch'

export type ReferenceSpaceQueryOk = {
  readonly ok: true
  readonly keys: ReferenceSpaceKeys
  readonly typeIr: {
    readonly availability: TypeIrAvailability
    readonly budget?: TypeIrPayload['budget']
  }
}

export type ReferenceSpaceQueryErr = {
  readonly ok: false
  readonly error: {
    readonly code: 'invalid_port_spec'
    readonly message: string
  }
}

export type ReferenceSpaceQueryResult = ReferenceSpaceQueryOk | ReferenceSpaceQueryErr

const uniqSorted = (values: Iterable<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort()

const keysFromPortSpec = (portSpec: ModulePortSpecPayload): ReferenceSpaceKeys => ({
  moduleId: portSpec.moduleId,
  actions: uniqSorted(portSpec.actions.map((a) => a.key)),
  events: uniqSorted(portSpec.events.map((e) => e.key)),
  outputs: uniqSorted(portSpec.outputs.map((o) => o.key)),
  exports: uniqSorted(portSpec.exports.map((e) => e.path)),
})

export const queryReferenceSpace = (input: {
  readonly portSpec: unknown
  readonly typeIr?: unknown
}): ReferenceSpaceQueryResult => {
  if (!isModulePortSpecPayload(input.portSpec)) {
    return {
      ok: false,
      error: {
        code: 'invalid_port_spec',
        message: 'Invalid ModulePortSpec payload: expected protocolVersion=v1 + moduleId + arrays of ports.',
      },
    }
  }

  const keys = keysFromPortSpec(input.portSpec)
  const typeIrRaw = input.typeIr

  if (typeIrRaw === undefined) {
    return { ok: true, keys, typeIr: { availability: 'missing' } }
  }

  if (!isTypeIrPayload(typeIrRaw)) {
    return { ok: true, keys, typeIr: { availability: 'invalid' } }
  }

  if (typeIrRaw.moduleId !== keys.moduleId) {
    return { ok: true, keys, typeIr: { availability: 'moduleId_mismatch', budget: typeIrRaw.budget } }
  }

  return {
    ok: true,
    keys,
    typeIr: {
      availability: typeIrRaw.truncated === true ? 'truncated' : 'present',
      budget: typeIrRaw.budget,
    },
  }
}

