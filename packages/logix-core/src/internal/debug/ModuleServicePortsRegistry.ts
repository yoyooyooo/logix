import { isDevEnv } from '../runtime/core/env.js'

export type ModuleServicePort = {
  readonly port: string
  readonly serviceId: string
  readonly optional?: boolean
}

// Debug/Devtools only: records declared service ports by moduleId.
// - Not used for runtime behavior decisions.
// - In production, stores nothing by default to avoid extra memory footprint.

const portsByModuleId = new Map<string, ReadonlyArray<ModuleServicePort>>()

// Devtools-only: avoid unbounded growth in dev with hot reload / many modules.
const MAX_MODULES = 200

export const registerModuleServicePorts = (moduleId: string, ports: ReadonlyArray<ModuleServicePort>): void => {
  if (!isDevEnv()) return
  if (!moduleId || moduleId.length === 0) return
  if (!ports || ports.length === 0) return

  portsByModuleId.set(moduleId, ports)

  if (portsByModuleId.size > MAX_MODULES) {
    const oldest = portsByModuleId.keys().next().value as string | undefined
    if (oldest) portsByModuleId.delete(oldest)
  }
}

export const getModuleServicePortsById = (moduleId: string): ReadonlyArray<ModuleServicePort> | undefined =>
  portsByModuleId.get(moduleId)

