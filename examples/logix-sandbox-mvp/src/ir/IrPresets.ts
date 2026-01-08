export type IrPreset = {
  readonly id: string
  readonly label: string
  readonly moduleExport: string
  readonly moduleCode: string
}

export const IR_PRESETS: ReadonlyArray<IrPreset> = [
  {
    id: 'p0',
    label: 'P0 Basic Module',
    moduleExport: 'AppRoot',
    moduleCode: `const Counter = Logix.Module.make("IrPreset.Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  immerReducers: {
    inc: (draft) => {
      draft.count += 1
    },
  },
  schemas: { Foo: Schema.String },
  meta: { owner: "demo" },
  dev: { source: { file: "IrPresets.ts", line: 1, column: 1 } },
})

const AppRoot = Counter.implement({
  initial: { count: 0 },
  logics: [],
})`,
  },
  {
    id: 'p1',
    label: 'P1 StaticIR DAG (Traits)',
    moduleExport: 'AppRoot',
    moduleCode: `const TraitState = Schema.Struct({ a: Schema.Number, derivedA: Schema.Number })

const traits = Logix.StateTrait.from(TraitState)({
  derivedA: Logix.StateTrait.node({
    computed: Logix.StateTrait.computed({
      deps: ["a"],
      get: (a) => a + 1,
    }),
  }),
})

const WithTraits = Logix.Module.make("IrPreset.WithTraits", {
  state: TraitState,
  actions: { noop: Schema.Void },
  reducers: { noop: (s) => s },
  traits,
})

const AppRoot = WithTraits.implement({
  initial: { a: 1, derivedA: 2 },
  logics: [],
})`,
  },
  {
    id: 'p2',
    label: 'P2 Missing Dependency (TrialRun)',
    moduleExport: 'AppRoot',
    moduleCode: `class BusinessService extends Context.Tag("BusinessService")<
  BusinessService,
  { readonly ping: () => Effect.Effect<string> }
>() {}

const Demo = Logix.Module.make("IrPreset.MissingDep", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
  reducers: { noop: (s) => s },
})

const useMissing = Demo.logic(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(BusinessService)
    const msg = yield* svc.ping()
    yield* Effect.log("ping: " + msg)
  }),
  { id: "logic:missing", kind: "user", name: "missing-dep" },
)

const AppRoot = Demo.implement({
  initial: { ok: true },
  logics: [useMissing],
})`,
  },
  {
    id: 'p3',
    label: 'P3 ControlPlane (RuntimeServicesEvidence)',
    moduleExport: 'AppRoot',
    moduleCode: `const ControlPlane = Logix.Module.make("IrPreset.ControlPlane", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
  reducers: { noop: (s) => s },
  meta: { owner: "demo" },
})

const gate = ControlPlane.logic(
  ($) =>
    Effect.gen(function* () {
      yield* Effect.log("[controlPlane] start")
      const report = yield* Logix.Kernel.RuntimeServicesEvidence.export
      yield* Effect.log("[controlPlane] runtimeServices=" + String(Object.keys(report.bindingsByServiceId ?? {}).length))
    }),
  { id: "logic:gate", kind: "user", name: "gate" },
)

const AppRoot = ControlPlane.implement({
  initial: { ok: true },
  logics: [gate],
})`,
  },
  {
    id: 'p4',
    label: 'P4 Timeline (EvidencePackage)',
    moduleExport: 'AppRoot',
    moduleCode: `const Timeline = Logix.Module.make("IrPreset.Timeline", {
  state: Schema.Struct({ n: Schema.Number }),
  actions: { inc: Schema.Void },
  immerReducers: {
    inc: (draft) => {
      draft.n += 1
    },
  },
})

const emit = Timeline.logic(
  ($) =>
    Effect.gen(function* () {
      yield* Effect.log("[timeline] start")
      yield* $.dispatchers.inc()
      yield* $.dispatchers.inc()
      yield* Effect.log("[timeline] done")
    }),
  { id: "logic:emit", kind: "user", name: "emit" },
)

const AppRoot = Timeline.implement({
  initial: { n: 0 },
  logics: [emit],
})`,
  },
  {
    id: 'p5',
    label: 'P5 Blank (Start Here)',
    moduleExport: 'AppRoot',
    moduleCode: `const App = Logix.Module.make("IrPreset.Blank", {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
  reducers: { noop: (s) => s },
})

const AppRoot = App.implement({
  initial: { ok: true },
  logics: [],
})`,
  },
  {
    id: 'p6',
    label: 'P6 Form Rules (Artifacts)',
    moduleExport: 'AppRoot',
    moduleCode: `import * as Form from "@logixjs/form"

const Values = Schema.Struct({ name: Schema.String })
const R = Form.rules(Values)

const AppRoot = Form.make("IrPreset.FormRules", {
  values: Values,
  initialValues: { name: "" },
  rules: R(R.field("name", { required: true })),
})`,
  },
]
