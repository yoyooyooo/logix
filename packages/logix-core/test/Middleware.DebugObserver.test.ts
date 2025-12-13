import { describe, it, expect } from "@effect/vitest"
import { Effect } from "effect"
import * as Logix from "../src/index.js"
import * as EffectOp from "../src/effectop.js"
import * as Middleware from "../src/middleware/index.js"

describe("Middleware.DebugObserver", () => {
  it("should emit trace:effectop Debug events with original EffectOp data for all core kinds", async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [
      Middleware.makeDebugObserver(),
    ]

    const kinds: Array<EffectOp.EffectOp["kind"]> = [
      "action",
      "flow",
      "state",
      "service",
      "lifecycle",
    ]

    const ops = kinds.map((kind) =>
      EffectOp.make<number, never, never>({
        kind,
        name: `debug-observer-${kind}`,
        effect: Effect.succeed(42),
        meta: {
          moduleId: "DebugObserverModule",
        },
      }),
    )

    const program = Effect.locally(
      Logix.Debug.internal.currentDebugSinks as any,
      [sink],
    )(
      Effect.forEach(
        ops,
        (op) => EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
        { discard: true },
      ),
    )

    await Effect.runPromise(program)

    const traceEvents = events.filter(
      (e) => typeof e.type === "string" && e.type.startsWith("trace:effectop"),
    )

    expect(traceEvents.length).toBeGreaterThanOrEqual(kinds.length)
    const last = traceEvents[traceEvents.length - 1] as any
    expect(last.moduleId).toBe("DebugObserverModule")
    expect(last.data).toBeDefined()
    expect(last.data.kind).toBeDefined()
    // 确认所有核心 kind 均被 DebugObserver 观测并透传到 Debug 事件中。
    const seenKinds = traceEvents
      .map((e) => (e as any).data?.kind)
      .filter((k: unknown): k is string => typeof k === "string")
    kinds.forEach((k) => {
      expect(seenKinds).toContain(k)
    })
  })

  it("should propagate txnId from EffectOp meta into RuntimeDebugEventRef", async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [
      Middleware.makeDebugObserver(),
    ]

    const op = EffectOp.make<number, never, never>({
      kind: "service",
      name: "DebugObserver.txn",
      effect: Effect.succeed(1),
      meta: {
        moduleId: "DebugObserverModule",
        txnId: "txn-123",
      },
    })

    const program = Effect.locally(
      Logix.Debug.internal.currentDebugSinks as any,
      [sink],
    )(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    await Effect.runPromise(program)

    const traceEvents = events.filter(
      (e) => typeof e.type === "string" && e.type === "trace:effectop",
    )
    expect(traceEvents.length).toBeGreaterThan(0)

    const runtimeRefs = traceEvents
      .map((event) =>
        Logix.Debug.internal.toRuntimeDebugEventRef(event),
      )
      .filter(
        (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
          ref != null,
      )

    expect(runtimeRefs.length).toBeGreaterThan(0)
    const last = runtimeRefs[runtimeRefs.length - 1]

    expect(last.txnId).toBe("txn-123")
    expect(last.moduleId).toBe("DebugObserverModule")
  })

  it("should allow disabling observer behavior via op.meta.policy.disableObservers", async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [
      Middleware.makeDebugObserver(),
    ]

    const op = EffectOp.make<number, never, never>({
      kind: "service",
      name: "DebugObserver.disabled",
      effect: Effect.succeed(1),
      meta: {
        moduleId: "DebugObserverModule",
        policy: { disableObservers: true },
      },
    })

    const program = Effect.locally(
      Logix.Debug.internal.currentDebugSinks as any,
      [sink],
    )(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    await Effect.runPromise(program)

    expect(
      events.some((e) => (e as any)?.type === "trace:effectop"),
    ).toBe(false)
  })

  it("should align trace:react-render events to the last state:update txnId for the same runtimeId", () => {
    const runtimeId = "runtime-1"
    const moduleId = "ReactRenderModule"

    const stateEvent: Logix.Debug.Event = {
      type: "state:update",
      moduleId,
      state: { count: 1 },
      runtimeId,
      txnId: "txn-render-001",
      runtimeLabel: "TestRuntime",
    }

    const renderEvent: Logix.Debug.Event = {
      type: "trace:react-render",
      moduleId,
      runtimeId,
      runtimeLabel: "TestRuntime",
      data: {
        componentLabel: "TestComponent",
        selectorKey: "countSelector",
        fieldPaths: ["count"],
      },
    }

    const stateRef = Logix.Debug.internal.toRuntimeDebugEventRef(stateEvent)!
    const renderRef = Logix.Debug.internal.toRuntimeDebugEventRef(
      renderEvent,
    )!

    expect(stateRef.kind).toBe("state")
    expect(stateRef.txnId).toBe("txn-render-001")

    expect(renderRef.kind).toBe("react-render")
    expect(renderRef.txnId).toBe("txn-render-001")
    expect(renderRef.moduleId).toBe(moduleId)

    const meta = renderRef.meta as any
    expect(meta).toBeDefined()
    expect(meta.componentLabel).toBe("TestComponent")
    expect(meta.selectorKey).toBe("countSelector")
    expect(meta.fieldPaths).toEqual(["count"])
  })
})
