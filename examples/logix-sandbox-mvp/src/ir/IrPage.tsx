import React, { useEffect, useMemo } from 'react'
import { shallow, useDispatch, useModule, useSelector } from '@logix/react'
import { Link } from 'react-router-dom'

import { Editor } from '../components/Editor'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Separator } from '../components/ui/separator'
import { ArtifactsPanel } from './ArtifactsPanel'
import { IrDef } from './IrModule'
import { IR_PRESETS } from './IrPresets'

const jsonPretty = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return `<<json stringify failed: ${String(e)}>>`
  }
}

const severityToBadge = (severity: string | undefined): 'info' | 'risky' | 'breaking' | 'outline' => {
  if (severity === 'BREAKING') return 'breaking'
  if (severity === 'RISKY') return 'risky'
  if (severity === 'INFO') return 'info'
  return 'outline'
}

const IR_PRESETS_LEGACY = [
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
  dev: { source: { file: "IrPage.tsx", line: 1, column: 1 } },
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

const AppRoot = ControlPlane.implement({
  initial: { ok: true },
  logics: [],
})`,
  },
  {
    id: 'p4',
    label: 'P4 Evidence Timeline (Emit Some Activity)',
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
    moduleCode: `import * as Form from "@logix/form"

const Values = Schema.Struct({ name: Schema.String })
const R = Form.rules(Values)

const AppRoot = Form.make("IrPreset.FormRules", {
  values: Values,
  initialValues: { name: "" },
  rules: R(R.field("name", { required: true })),
})`,
  },
]

const buildSandboxIrWrapper = (options: {
  readonly moduleCode: string
  readonly moduleExport: string
  readonly runId: string
  readonly kernelId: string
  readonly diagnosticsLevel: 'off' | 'light' | 'full'
  readonly maxEvents: number
  readonly trialRunTimeoutMs: number
  readonly closeScopeTimeout: number
  readonly maxBytes: number
}): string => {
  const trialRunOptions = {
    runId: options.runId,
    source: { host: 'browser', label: 'sandbox:/ir' },
    buildEnv: { hostKind: 'browser', config: {} },
    diagnosticsLevel: options.diagnosticsLevel,
    maxEvents: options.maxEvents,
    trialRunTimeoutMs: options.trialRunTimeoutMs,
    closeScopeTimeout: options.closeScopeTimeout,
    budgets: { maxBytes: options.maxBytes },
  }

  return [
    `import { Context, Effect, Schema } from "effect"`,
    `import * as Logix from "@logix/core"`,
    ``,
    options.moduleCode,
    ``,
    `const __programModule = ${options.moduleExport}`,
    `const __kernelId = ${JSON.stringify(options.kernelId)}`,
    `const __kernelLayer = (__kernelId === "core" || __kernelId === "core-ng") ? Logix.Kernel.kernelLayer({ kernelId: __kernelId, packageName: "@logix/core" }) : undefined`,
    ``,
    `export default Effect.gen(function* () {`,
    `  const trialRunModule = (Logix as any)?.Observability?.trialRunModule`,
    `  if (typeof trialRunModule !== "function") {`,
    `    throw new Error("[Logix][Sandbox] 缺少 Observability.trialRunModule：请重新 bundle @logix/sandbox kernel（pnpm --filter @logix/sandbox bundle:kernel）")`,
    `  }`,
    `  const options = ${JSON.stringify(trialRunOptions, null, 2)}`,
    `  const report = yield* trialRunModule(__programModule as any, __kernelLayer ? { ...options, layer: __kernelLayer } : options)`,
    `  return { manifest: (report as any)?.manifest, staticIr: (report as any)?.staticIr, trialRunReport: report, evidence: (report as any)?.evidence }`,
    `})`,
    ``,
  ].join('\n')
}

const ellipsis = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n…(${text.length - maxChars} chars truncated)`
}

export function IrPage() {
  const runtime = useModule(IrDef)
  const dispatch = useDispatch(runtime)

  const view = useSelector(
    runtime,
    (s) => ({
      activeTab: s.activeTab,
      bundle: s.bundle,
      activePresetId: s.activePresetId,
      moduleCode: s.moduleCode,
      moduleExport: s.moduleExport,
      mockManifestText: s.mockManifestText,
      runError: s.runError,
      runId: s.runId,
      diagnosticsLevel: s.diagnosticsLevel,
      maxEvents: s.maxEvents,
      trialRunTimeoutMs: s.trialRunTimeoutMs,
      closeScopeTimeout: s.closeScopeTimeout,
      maxBytes: s.maxBytes,
      isRunning: s.isRunning,

      kernelId: s.kernelId,
      strict: s.strict,
      allowFallback: s.allowFallback,
      kernels: s.kernels,
      defaultKernelId: s.defaultKernelId,
      runSummary: s.runSummary,

      staticIrSelectedNodeId: s.staticIrSelectedNodeId,
      timelineTypeFilter: s.timelineTypeFilter,
    }),
    shallow,
  )

  const {
    activeTab,
    bundle,
    activePresetId,
    moduleCode,
    moduleExport,
    mockManifestText,
    runError,
    runId,
    diagnosticsLevel,
    maxEvents,
    trialRunTimeoutMs,
    closeScopeTimeout,
    maxBytes,
    isRunning,

    kernelId,
    strict,
    allowFallback,
    kernels,
    defaultKernelId,
    runSummary,

    staticIrSelectedNodeId,
    timelineTypeFilter,
  } = view

  const activePreset = useMemo(() => IR_PRESETS.find((p) => p.id === activePresetId) ?? IR_PRESETS[0], [activePresetId])

  useEffect(() => {
    dispatch({ _tag: 'init', payload: undefined })
  }, [dispatch])

  const manifest = (bundle as any)?.manifest
  const diff = (bundle as any)?.diff
  const staticIr = (bundle as any)?.staticIr ?? (bundle as any)?.manifest?.staticIr
  const trialRunReport = (bundle as any)?.trialRunReport
  const evidence = (bundle as any)?.evidence ?? (bundle as any)?.trialRunReport?.evidence
  const artifacts = (bundle as any)?.trialRunReport?.artifacts

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div>
          <div className="text-sm font-semibold">IR</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            编辑 Module → 手动 Run → 查看 Manifest / StaticIR / TrialRun
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runSummary ? (
            <div className="flex items-center gap-1 mr-2">
              <Badge variant="outline">requested: {runSummary.requestedKernelId ?? '-'}</Badge>
              <Badge variant="outline">effective: {runSummary.effectiveKernelId ?? '-'}</Badge>
              {runSummary.fallbackReason ? <Badge variant="risky">fallback: {runSummary.fallbackReason}</Badge> : null}
              {runSummary.kernelImplementationRef ? (
                <Badge variant="outline">
                  implRef: {ellipsis(jsonPretty(runSummary.kernelImplementationRef), 120)}
                </Badge>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Kernel</span>
            <select
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
              value={kernelId}
              onChange={(e) => dispatch({ _tag: 'setKernelId', payload: e.target.value })}
              disabled={isRunning}
            >
              {(kernels ?? []).map((k: any) => (
                <option key={String(k.kernelId)} value={String(k.kernelId)}>
                  {String(k.label ?? k.kernelId)}
                  {defaultKernelId === k.kernelId ? ' (default)' : ''}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={strict}
                onChange={(e) => dispatch({ _tag: 'setKernelStrict', payload: e.target.checked })}
                disabled={isRunning}
              />
              strict
            </label>
            <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={allowFallback}
                onChange={(e) => dispatch({ _tag: 'setKernelAllowFallback', payload: e.target.checked })}
                disabled={isRunning || strict}
              />
              fallback
            </label>
          </div>
          <Button disabled={isRunning} onClick={() => dispatch({ _tag: 'run', payload: undefined })}>
            {isRunning ? 'Running…' : 'Run'}
          </Button>
          <div className="flex items-center gap-2">
            <Link
              data-testid="nav-playground"
              to="/playground"
              className="text-xs text-indigo-600 dark:text-indigo-400"
            >
              Playground
            </Link>
            <Link data-testid="nav-lab" to="/" className="text-xs text-indigo-600 dark:text-indigo-400">
              Lab
            </Link>
          </div>
        </div>
      </div>

      <main className="flex flex-1 overflow-hidden">
        {/* Left: Code (like /playground) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 truncate">irProgram.ts</span>
            </div>
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Code</div>
          </div>
          <div className="relative flex-1 bg-white dark:bg-zinc-900/30 overflow-hidden">
            <Editor
              code={moduleCode}
              onChange={(val) => dispatch({ _tag: 'setModuleCode', payload: val })}
              language="typescript"
              filename="irProgram.ts"
              enableTypeSense
              resetKey={activePresetId}
            />
          </div>
        </div>

        {/* Middle: Config */}
        <aside className="w-[360px] border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Presets</div>
              <div className="grid grid-cols-3 gap-2">
                {IR_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    variant={p.id === activePresetId ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => dispatch({ _tag: 'applyPreset', payload: p.id })}
                  >
                    {p.id.toUpperCase()}
                  </Button>
                ))}
              </div>
              {activePreset?.label ? (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{activePreset.label}</div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Run Options</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">moduleExport</div>
                  <Input
                    value={moduleExport}
                    onChange={(e) => dispatch({ _tag: 'setModuleExport', payload: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">runId</div>
                  <Input value={runId} onChange={(e) => dispatch({ _tag: 'setRunId', payload: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">diagnosticsLevel</div>
                  <div className="flex items-center gap-2">
                    {(['off', 'light', 'full'] as const).map((lvl) => (
                      <Button
                        key={lvl}
                        size="sm"
                        variant={diagnosticsLevel === lvl ? 'default' : 'secondary'}
                        onClick={() => dispatch({ _tag: 'setDiagnosticsLevel', payload: lvl })}
                      >
                        {lvl}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">maxEvents</div>
                  <Input
                    value={String(maxEvents)}
                    inputMode="numeric"
                    onChange={(e) => dispatch({ _tag: 'setMaxEvents', payload: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">timeoutMs</div>
                  <Input
                    value={String(trialRunTimeoutMs)}
                    inputMode="numeric"
                    onChange={(e) => dispatch({ _tag: 'setTrialRunTimeoutMs', payload: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">closeScopeTimeout</div>
                  <Input
                    value={String(closeScopeTimeout)}
                    inputMode="numeric"
                    onChange={(e) => dispatch({ _tag: 'setCloseScopeTimeout', payload: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">maxBytes</div>
                  <Input
                    value={String(maxBytes)}
                    inputMode="numeric"
                    onChange={(e) => dispatch({ _tag: 'setMaxBytes', payload: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mock Manifest (optional)</div>
              <Textarea
                value={mockManifestText}
                onChange={(e) => dispatch({ _tag: 'setMockManifestText', payload: e.target.value })}
                placeholder="粘贴 MockManifest JSON（会传给 sandbox compile）"
                className="font-mono text-xs"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    dispatch({ _tag: 'setMockManifestText', payload: '' })
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: Results */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-50 dark:bg-zinc-950">
          {runError && (
            <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertTitle>Run Failed</AlertTitle>
              <AlertDescription>
                <div className="font-mono text-xs whitespace-pre-wrap">{runError}</div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v: any) => dispatch({ _tag: 'setActiveTab', payload: v })}>
            <TabsList>
              <TabsTrigger value="manifest">Manifest</TabsTrigger>
              <TabsTrigger value="diff">Diff</TabsTrigger>
              <TabsTrigger value="staticIr">StaticIR</TabsTrigger>
              <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
              <TabsTrigger value="trialRun">TrialRun</TabsTrigger>
              <TabsTrigger value="controlPlane">ControlPlane</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="manifest">
              <ManifestPanel
                manifest={manifest}
                onClickStaticIrDigest={() => dispatch({ _tag: 'setActiveTab', payload: 'staticIr' })}
              />
            </TabsContent>

            <TabsContent value="diff">
              <DiffPanel diff={diff} />
            </TabsContent>

            <TabsContent value="staticIr">
              <StaticIrPanel
                staticIr={staticIr}
                selectedNodeId={staticIrSelectedNodeId}
                onSelectNodeId={(id) => dispatch({ _tag: 'setStaticIrSelectedNodeId', payload: id })}
              />
            </TabsContent>

            <TabsContent value="artifacts">
              <ArtifactsPanel artifacts={artifacts} />
            </TabsContent>

            <TabsContent value="trialRun">
              <TrialRunPanel report={trialRunReport} />
            </TabsContent>

            <TabsContent value="controlPlane">
              <ControlPlanePanel report={trialRunReport} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelinePanel
                evidence={evidence}
                typeFilter={timelineTypeFilter}
                onChangeTypeFilter={(next) => dispatch({ _tag: 'setTimelineTypeFilter', payload: next })}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function ManifestPanel({ manifest, onClickStaticIrDigest }: { manifest: any; onClickStaticIrDigest: () => void }) {
  if (!manifest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ModuleManifest</CardTitle>
          <CardDescription>未加载</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{manifest.moduleId}</CardTitle>
            <CardDescription>
              digest: <span className="font-mono text-[11px]">{manifest.digest}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">actions: {manifest.actionKeys?.length ?? 0}</Badge>
              <Badge variant="outline">schemas: {manifest.schemaKeys?.length ?? 0}</Badge>
              <Badge variant="outline">logicUnits: {manifest.logicUnits?.length ?? 0}</Badge>
              {manifest.staticIr?.digest && (
                <button
                  className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 underline"
                  onClick={onClickStaticIrDigest}
                >
                  staticIr.digest → {manifest.staticIr.digest}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
          <CardDescription>结构化投影（可 diff）</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(manifest)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function DiffPanel({ diff }: { diff: any }) {
  if (!diff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ModuleManifestDiff</CardTitle>
          <CardDescription>未加载</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Verdict: {diff.verdict}</CardTitle>
          <CardDescription>
            breaking={diff.summary?.breaking ?? 0} risky={diff.summary?.risky ?? 0} info={diff.summary?.info ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(diff.changes ?? []).map((c: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <Badge variant={severityToBadge(c.severity)}>{c.severity}</Badge>
                <div className="min-w-0">
                  <div className="text-xs font-semibold">
                    <span className="font-mono text-[11px]">{c.code}</span>
                    {c.pointer ? <span className="ml-2 text-zinc-500 dark:text-zinc-400">{c.pointer}</span> : null}
                  </div>
                  {c.message ? <div className="text-xs text-zinc-600 dark:text-zinc-300">{c.message}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(diff)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function StaticIrPanel({
  staticIr,
  selectedNodeId,
  onSelectNodeId,
}: {
  staticIr: any
  selectedNodeId: string | null
  onSelectNodeId: (id: string | null) => void
}) {
  const nodes: any[] = Array.isArray(staticIr?.nodes) ? staticIr.nodes : []
  const edges: any[] = Array.isArray(staticIr?.edges) ? staticIr.edges : []

  const graph = useMemo(() => {
    const nextByFrom = new Map<string, string[]>()
    const prevByTo = new Map<string, string[]>()

    for (const e of edges) {
      const from = typeof e?.from === 'string' ? e.from : null
      const to = typeof e?.to === 'string' ? e.to : null
      if (!from || !to) continue

      const next = nextByFrom.get(from) ?? []
      next.push(to)
      nextByFrom.set(from, next)

      const prev = prevByTo.get(to) ?? []
      prev.push(from)
      prevByTo.set(to, prev)
    }

    const uniqSort = (xs: string[]) => Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b))

    for (const [k, v] of nextByFrom) nextByFrom.set(k, uniqSort(v))
    for (const [k, v] of prevByTo) prevByTo.set(k, uniqSort(v))

    const walk = (start: string, dir: 'next' | 'prev'): ReadonlySet<string> => {
      const seen = new Set<string>()
      const queue: string[] = [start]

      while (queue.length > 0) {
        const cur = queue.shift()!
        const next = dir === 'next' ? (nextByFrom.get(cur) ?? []) : (prevByTo.get(cur) ?? [])
        for (const n of next) {
          if (n === start) continue
          if (seen.has(n)) continue
          seen.add(n)
          queue.push(n)
        }
      }

      return seen
    }

    return {
      nextByFrom,
      prevByTo,
      depsOf: (nodeId: string) => walk(nodeId, 'next'),
      impactOf: (nodeId: string) => walk(nodeId, 'prev'),
    }
  }, [edges])

  const deps = selectedNodeId ? graph.depsOf(selectedNodeId) : new Set<string>()
  const impact = selectedNodeId ? graph.impactOf(selectedNodeId) : new Set<string>()

  if (!staticIr) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>StaticIR</CardTitle>
          <CardDescription>未加载</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{staticIr.moduleId}</CardTitle>
          <CardDescription>
            digest: <span className="font-mono text-[11px]">{staticIr.digest}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(staticIr.conflicts) && staticIr.conflicts.length > 0 ? (
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertTitle>Conflicts</AlertTitle>
              <AlertDescription>
                <div className="font-mono text-xs">{staticIr.conflicts.length} conflict(s)</div>
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedNodeId ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">selected: {selectedNodeId}</Badge>
              <Badge variant="outline">deps: {deps.size}</Badge>
              <Badge variant="outline">impact: {impact.size}</Badge>
              <Button size="sm" variant="outline" onClick={() => onSelectNodeId(null)}>
                Clear
              </Button>
            </div>
          ) : (
            <div className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
              点击 node 查看依赖/影响闭包（best-effort）
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-semibold text-zinc-500 dark:text-zinc-400">Nodes</div>
              <div className="mt-1 space-y-1">
                {nodes.slice(0, 80).map((n: any) => (
                  <button
                    key={n.nodeId}
                    className={[
                      'w-full text-left rounded border px-2 py-1 dark:border-white/10',
                      selectedNodeId === n.nodeId
                        ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                        : deps.has(n.nodeId)
                          ? 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5'
                          : impact.has(n.nodeId)
                            ? 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5'
                            : 'border-zinc-200 dark:border-white/10',
                    ].join(' ')}
                    onClick={() => onSelectNodeId(n.nodeId)}
                  >
                    <div className="font-mono text-[11px]">{n.nodeId}</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300">kind={n.kind}</div>
                    {Array.isArray(n.reads) && n.reads.length > 0 ? (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">reads: {n.reads.join(', ')}</div>
                    ) : null}
                    {Array.isArray(n.writes) && n.writes.length > 0 ? (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">writes: {n.writes.join(', ')}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-zinc-500 dark:text-zinc-400">Edges</div>
              <div className="mt-1 space-y-1">
                {edges.slice(0, 120).map((e: any) => (
                  <div key={e.edgeId} className="rounded border border-zinc-200 px-2 py-1 dark:border-white/10">
                    <div className="font-mono text-[11px]">{e.edgeId}</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      {e.from} → {e.to} ({e.kind})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(staticIr)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function TrialRunPanel({ report }: { report: any }) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TrialRunReport</CardTitle>
          <CardDescription>未加载</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const env = report.environment
  const ok = Boolean(report.ok)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {ok ? 'OK' : 'FAILED'}{' '}
            <span className="ml-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{report.runId}</span>
          </CardTitle>
          <CardDescription>
            {report.error?.code ? <span className="font-mono">{report.error.code}</span> : null}
            {report.error?.message ? <span className="ml-2">{report.error.message}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.error?.hint ? (
            <Alert>
              <AlertTitle>Hint</AlertTitle>
              <AlertDescription>{report.error.hint}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-semibold text-zinc-500 dark:text-zinc-400">missingServices</div>
              <div className="mt-1 font-mono text-[11px]">
                {Array.isArray(env?.missingServices) && env.missingServices.length > 0
                  ? env.missingServices.join(', ')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="font-semibold text-zinc-500 dark:text-zinc-400">missingConfigKeys</div>
              <div className="mt-1 font-mono text-[11px]">
                {Array.isArray(env?.missingConfigKeys) && env.missingConfigKeys.length > 0
                  ? env.missingConfigKeys.join(', ')
                  : '—'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="font-semibold text-zinc-500 dark:text-zinc-400">
                tagIds / configKeys (observed/best-effort)
              </div>
              <div className="mt-1 font-mono text-[11px]">
                tagIds={Array.isArray(env?.tagIds) ? env.tagIds.length : 0}, configKeys=
                {Array.isArray(env?.configKeys) ? env.configKeys.length : 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(report)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function ControlPlanePanel({ report }: { report: any }) {
  const evidence = report?.environment?.runtimeServicesEvidence
  if (!evidence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RuntimeServicesEvidence</CardTitle>
          <CardDescription>未加载（从 TrialRunReport.environment.runtimeServicesEvidence 读取）</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>scope={evidence.scope}</CardTitle>
          <CardDescription>
            moduleId={evidence.moduleId ?? '—'} instanceId={evidence.instanceId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {(evidence.bindings ?? []).map((b: any, idx: number) => (
              <div key={idx} className="rounded border border-zinc-200 p-2 dark:border-white/10">
                <div className="font-mono text-[11px]">{b.serviceId}</div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  scope={b.scope} overridden={String(Boolean(b.overridden))} implId={b.implId ?? '—'}
                </div>
                {b.notes ? <div className="text-[11px] text-zinc-500 dark:text-zinc-400">notes: {b.notes}</div> : null}
              </div>
            ))}
          </div>

          {Array.isArray(evidence.overridesApplied) && evidence.overridesApplied.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">overridesApplied</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                {evidence.overridesApplied.join('\n')}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(evidence)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function TimelinePanel({
  evidence,
  typeFilter,
  onChangeTypeFilter,
}: {
  evidence: any
  typeFilter: string
  onChangeTypeFilter: (next: string) => void
}) {
  const events: any[] = Array.isArray(evidence?.events) ? evidence.events : []
  const filtered =
    typeFilter.trim().length === 0 ? events : events.filter((e) => String(e?.type ?? '').includes(typeFilter.trim()))

  if (!evidence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>EvidencePackage</CardTitle>
          <CardDescription>未加载</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            runId <span className="font-mono text-[11px]">{evidence.runId}</span>
          </CardTitle>
          <CardDescription>
            events: {filtered.length} / {events.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={typeFilter}
                onChange={(e) => onChangeTypeFilter(e.target.value)}
                placeholder="Filter by type (substring)"
              />
              <Button size="sm" variant="outline" onClick={() => onChangeTypeFilter('')}>
                Clear
              </Button>
            </div>

            {filtered.slice(0, 200).map((evt: any) => (
              <div key={evt.seq} className="rounded border border-zinc-200 p-2 dark:border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-mono text-[11px]">#{evt.seq}</div>
                  <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{evt.type}</div>
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-950 p-3 text-xs text-zinc-100 overflow-auto">
                  {jsonPretty(evt.payload)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
            {jsonPretty(evidence)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
