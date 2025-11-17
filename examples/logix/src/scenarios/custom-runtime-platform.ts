import { Effect, Layer, Stream, Console, Schema } from 'effect'
import * as Logix from '@logix/core'

// -----------------------------------------------------------------------------
// 2. Platform Implementations (The Custom Runtimes)
// Defined in @logix/react or @logix/node.
// -----------------------------------------------------------------------------

// Scenario A: React / Browser Runtime
// Implements 'suspend' by listening to Page Visibility API
const ReactPlatformLive: Layer.Layer<Logix.Platform.Service, never, never> = Layer.succeed(Logix.Platform.tag, {
  lifecycle: {
    onSuspend: (eff: Effect.Effect<void, never, any>) =>
      // In a real app, this would listen to document.addEventListener("visibilitychange")
      Stream.make(1).pipe(
        // Simulating an event
        Stream.tap(() => Console.log('[ReactPlatform] Detected visibility: hidden')),
        Stream.runForEach(() => eff),
      ),
    onResume: () => Effect.void,
    onReset: () => Effect.void,
  },
  emitSuspend: () => Effect.void,
  emitResume: () => Effect.void,
  emitReset: () => Effect.void,
})

// Scenario B: Node / Server Runtime
// Server never suspends in this context, so this is a no-op
const NodePlatformLive: Layer.Layer<Logix.Platform.Service, never, never> = Layer.succeed(Logix.Platform.tag, {
  lifecycle: {
    onSuspend: () => Effect.void, // Do nothing
    onResume: () => Effect.void,
    onReset: () => Effect.void,
  },
  emitSuspend: () => Effect.void,
  emitResume: () => Effect.void,
  emitReset: () => Effect.void,
})

// -----------------------------------------------------------------------------
// 3. The Business Logic (Platform Agnostic)
// Written once, runs anywhere.
// -----------------------------------------------------------------------------

// A module that polls data, but wants to stop when app is suspended
const PollingStateSchema = Schema.Struct({})
const PollingActionMap = {}

const PollingDef = Logix.Module.make('Polling', {
  state: PollingStateSchema,
  actions: PollingActionMap,
})

const PollingLogic = PollingDef.logic(($) =>
  Effect.gen(function* () {
    // Ideally this is exposed via $.lifecycle.onSuspend
    // But internally it just consumes the Platform service
    const platform = yield* Logix.Platform.tag

    yield* Console.log('[Logic] Module initialized. Starting Polling...')

    // This logic adapts to the runtime it's running in:
    // - In React: Will log when tab is hidden
    // - In Node: Will never log this
    yield* platform.lifecycle.onSuspend(Console.log('[Logic] ⏸️ App suspended! Pausing Polling...'))
  }),
)

const PollingModule = PollingDef.implement({
  initial: {},
  logics: [PollingLogic],
})

// -----------------------------------------------------------------------------
// 4. The Runtime Assembly (Wiring it up)
// The User decides which "Runtime" to use by composing Layers + Root ModuleImpl.
// -----------------------------------------------------------------------------

// Runtime 1: Web Application (Uses React-like Platform)
export const WebRuntime = Logix.Runtime.make(PollingModule, {
  // ✨ MAGIC HERE: We inject the React behavior
  layer: ReactPlatformLive,
})

// Runtime 2: CLI Tool (Uses Node Platform)
export const CliRuntime = Logix.Runtime.make(PollingModule, {
  // ✨ MAGIC HERE: We inject the Node behavior
  layer: NodePlatformLive,
})

// -----------------------------------------------------------------------------
// 5. Running it (The "makeRuntime" Demo)
// -----------------------------------------------------------------------------

const main = Effect.gen(function* () {
  // 1. Boot the Runtime (This starts the engine & infra)
  //    In React, <RuntimeProvider> does this for you.
  const runtime = CliRuntime

  console.log('✅ Runtime booted!')

  // 2. Run a program using this runtime
  //    The program can access all Modules & Infra in the App
  //    NOTE: runPromise returns a Promise, so we wrap it in Effect.promise to yield* it
  yield* Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        // Access the PollingModule (which was injected into the App)
        // const polling = yield* PollingModule
        // yield* polling.dispatch(...)
        console.log('🚀 Running program inside App Runtime')
      }),
    ),
  )

  // 3. Graceful Shutdown
  //    This triggers all onDestroy hooks and releases resources (Scope)
  yield* Effect.promise(() => runtime.dispose())
  console.log('🛑 Runtime disposed')
})

// Run the demo
// Effect.runPromise(main)
