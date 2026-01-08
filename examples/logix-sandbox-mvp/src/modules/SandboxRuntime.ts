import type { ActionOf, StateOf } from '@logixjs/core'
import type { ModuleRef } from '@logixjs/react'

type SandboxShape = (typeof import('./SandboxModule').SandboxDef)['shape']

export type SandboxState = StateOf<SandboxShape>
export type SandboxAction = ActionOf<SandboxShape>

export type SandboxRuntime = ModuleRef<SandboxState, SandboxAction>

export type SandboxTab = SandboxState['activeTab']
