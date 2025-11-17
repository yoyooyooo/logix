import type React from 'react'
import * as Logix from '@logix/core'
import { ReactPlatformLayer, RuntimeProvider } from '@logix/react'
import { Layer } from 'effect'
import { SandboxClientLayer } from '@logix/sandbox'
import { GalaxyRootModule } from './galaxy/root.module'

// Minimal runtime layer that wires Logix Debug tooling and Sandbox client.
const ClientLayer = SandboxClientLayer()

const AppLayer = Layer.mergeAll(ClientLayer, ReactPlatformLayer) as Layer.Layer<any, never, never>

const appRuntime = Logix.Runtime.make(GalaxyRootModule, {
  label: 'logix-galaxy-fe',
  ...(import.meta.env.DEV ? ({ devtools: true } as const) : {}),
  debug: import.meta.env.DEV ? { mode: 'dev', devConsole: 'diagnostic' } : { mode: 'prod' },
  layer: AppLayer,
})

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
