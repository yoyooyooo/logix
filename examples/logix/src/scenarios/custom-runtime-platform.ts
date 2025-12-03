import { Context, Effect, Layer, Stream, Console, Schema } from "effect"
import { Logix, LogixRuntime } from "@logix/core"

// -----------------------------------------------------------------------------
// 1. Core Definition (The Contract)
// Defined in @logix/core, used by Logic authors.
// -----------------------------------------------------------------------------

interface Platform {
  readonly lifecycle: {
    /**
     * Register an effect to run when the platform signals "suspension"
     * (e.g. Tab hidden, App backgrounded).
     */
    readonly onSuspend: (eff: Effect.Effect<void>) => Effect.Effect<void>
  }
}

const Platform = Context.GenericTag<Platform>("@logix/Platform")

// -----------------------------------------------------------------------------
// 2. Platform Implementations (The Custom Runtimes)
// Defined in @logix/react or @logix/node.
// -----------------------------------------------------------------------------

// Scenario A: React / Browser Runtime
// Implements 'suspend' by listening to Page Visibility API
const ReactPlatformLive = Layer.succeed(Platform, {
  lifecycle: {
    onSuspend: (eff) =>
      // In a real app, this would listen to document.addEventListener("visibilitychange")
      Stream.make(1).pipe( // Simulating an event
        Stream.tap(() => Console.log("[ReactPlatform] Detected visibility: hidden")),
        Stream.runForEach(() => eff)
      )
  }
})

// Scenario B: Node / Server Runtime
// Server never suspends in this context, so this is a no-op
const NodePlatformLive = Layer.succeed(Platform, {
  lifecycle: {
    onSuspend: () => Effect.void // Do nothing
  }
})

// -----------------------------------------------------------------------------
// 3. The Business Logic (Platform Agnostic)
// Written once, runs anywhere.
// -----------------------------------------------------------------------------

// A module that polls data, but wants to stop when app is suspended
const PollingStateSchema = Schema.Struct({})
const PollingActionMap = {}

const PollingModule = Logix.Module("Polling", {
  state: PollingStateSchema,
  actions: PollingActionMap,
})

const PollingLogic = PollingModule.logic(($) =>
  Effect.gen(function* () {
    // Ideally this is exposed via $.lifecycle.onSuspend
    // But internally it just consumes the Platform service
    const platform = yield* Platform

    yield* Console.log("[Logic] Module initialized. Starting Polling...")

    // This logic adapts to the runtime it's running in:
    // - In React: Will log when tab is hidden
    // - In Node: Will never log this
    yield* platform.lifecycle.onSuspend(
      Console.log("[Logic] ⏸️ App suspended! Pausing Polling..."),
    )
  }),
)

const PollingImpl = PollingModule.make({
  initial: {},
  logics: [PollingLogic],
})

// -----------------------------------------------------------------------------
// 4. The Runtime Assembly (Wiring it up)
// The User decides which "Runtime" to use by composing Layers + Root ModuleImpl.
// -----------------------------------------------------------------------------

// Runtime 1: Web Application (Uses React-like Platform)
export const WebRuntime = LogixRuntime.make(PollingImpl, {
  // ✨ MAGIC HERE: We inject the React behavior
  layer: ReactPlatformLive as Layer.Layer<any, never, never>,
})

// Runtime 2: CLI Tool (Uses Node Platform)
export const CliRuntime = LogixRuntime.make(PollingImpl, {
  // ✨ MAGIC HERE: We inject the Node behavior
  layer: NodePlatformLive as Layer.Layer<any, never, never>,
})

// -----------------------------------------------------------------------------
// 5. Running it (The "makeRuntime" Demo)
// -----------------------------------------------------------------------------

const main = Effect.gen(function*() {
    // 1. Boot the Runtime (This starts the engine & infra)
    //    In React, <RuntimeProvider> does this for you.
    const runtime = CliRuntime

    console.log("✅ Runtime booted!")

    // 2. Run a program using this runtime
    //    The program can access all Modules & Infra in the App
    //    NOTE: runPromise returns a Promise, so we wrap it in Effect.promise to yield* it
    yield* Effect.promise(() => runtime.runPromise(Effect.gen(function*() {
        // Access the PollingModule (which was injected into the App)
        // const polling = yield* PollingModule
        // yield* polling.dispatch(...)
        console.log("🚀 Running program inside App Runtime")
    })))

    // 3. Graceful Shutdown
    //    This triggers all onDestroy hooks and releases resources (Scope)
    yield* Effect.promise(() => runtime.dispose())
    console.log("🛑 Runtime disposed")
})

// Run the demo
// Effect.runPromise(main)
