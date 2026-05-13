import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '@logixjs/react'
import { ConfigProvider, Layer, Schema } from 'effect'
import { SandboxClientLayer } from '@logixjs/sandbox'
import { SandboxProgram } from './modules/SandboxProgram'
import { sandboxClientConfig } from './sandboxClientConfig'
import { IrProgram } from './ir/IrProgram'
import { ThemeProgram } from './modules/ThemeProgram'

const AppDef = Logix.Module.make('SandboxMvpApp', {
  state: Schema.Void,
  actions: {},
})

const AppProgram = Logix.Program.make(AppDef, {
  initial: undefined,
  capabilities: {
    imports: [SandboxProgram, IrProgram, ThemeProgram],
  },
})

const ClientLayer = SandboxClientLayer(sandboxClientConfig)

const ReactConfigLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({ 'logix.react.gc_time': String(5 * 60_000) }),
)

const AppLayer = Layer.mergeAll(
  ReactConfigLayer as Layer.Layer<any, never, never>,
  ClientLayer,
  CoreDebug.layer({ mode: 'dev' }),
  CoreDebug.traceLayer(),
) as Layer.Layer<any, never, never>

const appRuntime = Logix.Runtime.make(AppProgram, { layer: AppLayer })

export function SandboxRuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
}
