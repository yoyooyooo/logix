import type React from 'react'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '@logixjs/react'
import { SandboxClientLayer } from '@logixjs/sandbox'
import { GalaxyRootProgram } from './galaxy/root.module'

// Minimal runtime layer that wires Logix Debug tooling and Sandbox client.
const AppLayer = SandboxClientLayer()

const appRuntime = Logix.Runtime.make(GalaxyRootProgram, {
  label: 'logix-galaxy-fe',
  ...(import.meta.env.DEV ? ({ devtools: true } as const) : {}),
  debug: import.meta.env.DEV ? { mode: 'dev', devConsole: 'diagnostic' } : { mode: 'prod' },
  layer: AppLayer,
})

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
