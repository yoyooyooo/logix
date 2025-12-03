import { Context, Effect, Layer, Option } from "effect"

export type DebugEvent =
  | { readonly type: "module:init"; readonly moduleId?: string }
  | { readonly type: "module:destroy"; readonly moduleId?: string }
  | {
      readonly type: "action:dispatch"
      readonly moduleId?: string
      readonly action: unknown
    }
  | {
      readonly type: "state:update"
      readonly moduleId?: string
      readonly state: unknown
    }
  | {
      readonly type: "lifecycle:error"
      readonly moduleId?: string
      readonly cause: unknown
    }

export interface DebugSink {
  readonly record: (event: DebugEvent) => Effect.Effect<void>
}

export const DebugSinkTag = Context.GenericTag<DebugSink>(
  "@logix/DebugSink"
)

export const NoopDebugSinkLayer = Layer.succeed(DebugSinkTag, {
  record: () => Effect.void,
})

export const ConsoleDebugLayer = Layer.succeed(DebugSinkTag, {
  record: (event: DebugEvent) => Effect.logDebug({ debugEvent: event }),
})

export const record = (event: DebugEvent) =>
  Effect.serviceOption(DebugSinkTag).pipe(
    Effect.flatMap((maybeSink) => {
      console.log(
        "[DebugSink] Recording event:",
        event.type,
        "moduleId:" in event ? event.moduleId : undefined,
        "Sink found:",
        Option.isSome(maybeSink),
      )
      return Option.match(maybeSink, {
        onSome: (sink) => sink.record(event),
        onNone: () => Effect.void,
      })
    })
  )
