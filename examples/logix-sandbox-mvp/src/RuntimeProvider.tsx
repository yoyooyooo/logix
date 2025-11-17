import { Debug } from '@logix/core'
import { RuntimeProvider } from '@logix/react'
import { ConfigProvider, Layer, ManagedRuntime } from 'effect'
import { SandboxClientLayer } from '@logix/sandbox'
import { SandboxImpl } from './modules/SandboxImpl'
import { sandboxClientConfig } from './sandboxClientConfig'
import { IrImpl } from './ir/IrImpl'
import { ThemeImpl } from './modules/ThemeImpl'

const ClientLayer = SandboxClientLayer(sandboxClientConfig)
const SandboxLayer = SandboxImpl.layer.pipe(Layer.provide(ClientLayer))
const IrLayer = IrImpl.layer.pipe(Layer.provide(ClientLayer))
const ThemeLayer = ThemeImpl.layer

const ReactConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromMap(new Map<string, string>([['logix.react.gc_time', String(5 * 60_000)]])),
)

const AppLayer = Layer.mergeAll(
  ReactConfigLayer as Layer.Layer<any, never, never>,
  ClientLayer,
  SandboxLayer,
  IrLayer,
  ThemeLayer,
  Debug.layer({ mode: 'dev' }),
  Debug.traceLayer(),
) as Layer.Layer<any, never, never>

const appRuntime = ManagedRuntime.make(AppLayer)

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
