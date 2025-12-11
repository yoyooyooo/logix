import { Debug } from '@logix/core'
import { RuntimeProvider } from '@logix/react'
import { Layer, ManagedRuntime } from 'effect'
import { SandboxClientLayer } from '@logix/sandbox'
import { SandboxImpl } from './modules/SandboxImpl'

const ClientLayer = SandboxClientLayer()
const ImplLayer = SandboxImpl.layer.pipe(Layer.provide(ClientLayer))

const AppLayer = Layer.mergeAll(
  ClientLayer,
  ImplLayer,
  Debug.layer({ mode: "dev" }),
  Debug.traceLayer(),
)

const appRuntime = ManagedRuntime.make(AppLayer)

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
