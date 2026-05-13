import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
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

const AppRoot = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [],
})`,
  },
  {
    id: 'p1',
    label: 'P1 StaticIR DAG (Fields)',
    moduleExport: 'AppRoot',
    moduleCode: `const FieldState = Schema.Struct({ a: Schema.Number, derivedA: Schema.Number })

const fieldDeclarations = CoreContracts.fieldFrom(FieldState)({
  derivedA: CoreContracts.fieldNode({
    computed: CoreContracts.fieldComputed({
      deps: ["a"],
      get: (a) => a + 1,
    }),
  }),
})

const WithFields = Logix.Module.make("IrPreset.WithFields", {
  state: FieldState,
  actions: { noop: Schema.Void },
  reducers: { noop: (s) => s },
})

const fieldsLogic = WithFields.logic("with-fields", ($) => {
  $.fields(fieldDeclarations)
  return Effect.void
})

const AppRoot = Logix.Program.make(WithFields, {
  initial: { a: 1, derivedA: 2 },
  logics: [fieldsLogic],
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

const useMissing = Demo.logic('use-missing', ($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(BusinessService)
    const msg = yield* svc.ping()
    yield* Effect.log("ping: " + msg)
  }),
  { id: "logic:missing", kind: "user", name: "missing-dep" },
)

const AppRoot = Logix.Program.make(Demo, {
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

const gate = ControlPlane.logic('gate', ($) =>
    Effect.gen(function* () {
      yield* Effect.log("[controlPlane] start")
      const report = yield* CoreKernel.RuntimeServicesEvidence.export
      yield* Effect.log("[controlPlane] runtimeServices=" + String(Object.keys(report.bindingsByServiceId ?? {}).length))
    }),
  { id: "logic:gate", kind: "user", name: "gate" },
)

const AppRoot = Logix.Program.make(ControlPlane, {
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

const emit = Timeline.logic('emit', ($) =>
    Effect.gen(function* () {
      yield* Effect.log("[timeline] start")
      yield* $.dispatchers.inc()
      yield* $.dispatchers.inc()
      yield* Effect.log("[timeline] done")
    }),
  { id: "logic:emit", kind: "user", name: "emit" },
)

const AppRoot = Logix.Program.make(Timeline, {
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

const AppRoot = Logix.Program.make(App, {
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

const AppRoot = Form.make("IrPreset.FormRules", {
  values: Values,
  initialValues: { name: "" },
}, (form) => {
  const z = form.dsl as any
  form.rules(z(z.field("name", { required: true })))
})`,
  },
]
