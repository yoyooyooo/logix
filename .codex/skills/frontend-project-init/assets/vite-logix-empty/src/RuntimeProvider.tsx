import type React from 'react'
import { Debug } from '@logix/core'
import { RuntimeProvider } from '@logix/react'
import { Layer, ManagedRuntime } from 'effect'
import { SandboxClientLayer } from '@logix/sandbox'

// Minimal runtime layer that wires Logix Debug tooling and Sandbox client.
const ClientLayer = SandboxClientLayer()

const AppLayer = Layer.mergeAll(ClientLayer, Debug.layer({ mode: 'dev' }), Debug.traceLayer()) as Layer.Layer<
  any,
  never,
  never
>

const appRuntime = ManagedRuntime.make(AppLayer)

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
