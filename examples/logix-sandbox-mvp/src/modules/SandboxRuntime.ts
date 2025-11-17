import type { ActionOf, StateOf } from '@logix/core'
import type { ModuleRef } from '@logix/react'

type SandboxShape = (typeof import('./SandboxModule').SandboxDef)['shape']

export type SandboxState = StateOf<SandboxShape>
export type SandboxAction = ActionOf<SandboxShape>

export type SandboxRuntime = ModuleRef<SandboxState, SandboxAction>

export type SandboxTab = SandboxState['activeTab']
