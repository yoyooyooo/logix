import React, { useEffect, useRef } from 'react'
import { useModule, useSelector, useDispatch } from '@logix/react'
import { SandboxImpl } from './modules/SandboxImpl'
import { type SandboxStatus, type LogEntry, type TraceSpan, type UiIntentPacket } from '@logix/sandbox'
import { ThemeToggle } from './components/ThemeToggle'
import { SpecNavigation } from './components/SpecNavigation'
import { StepDetailPanel } from './components/StepDetailPanel'
import { Editor } from './components/Editor'
import { Routes as RouterRoutes, Route as RouterRoute } from 'react-router-dom'
import './style.css'

// Cast router components to any to avoid JSX typing friction in this example project.
const Routes: any = RouterRoutes
const Route: any = RouterRoute

// ============================================================================
// Main Application (Router shell)
// ============================================================================

export default function App() {
  return (
    <Routes>
      <Route path="/playground" element={<SandboxPlaygroundPage />} />
      <Route path="*" element={<RuntimeAlignmentLabPage />} />
    </Routes>
  )
}

// ============================================================================
// Pages
// ============================================================================

function RuntimeAlignmentLabPage() {
  const runtime = useModule(SandboxImpl, {
    key: 'sandbox-root',
  })

  const status = useSelector(runtime, (s) => s.status)
  const logs = useSelector(runtime, (s) => s.logs)
  const traces = useSelector(runtime, (s) => s.traces)
  const error = useSelector(runtime, (s) => s.error)
  const runResult = useSelector(runtime, (s) => s.runResult)
  const activeTab = useSelector(runtime, (s) => s.activeTab)
  const code = useSelector(runtime, (s) => s.code)
  const uiIntents = useSelector(runtime, (s) => s.uiIntents)
  const scenarioId = useSelector(runtime, (s) => s.scenarioId)
  const scenarioSteps = useSelector(runtime, (s) => s.scenarioSteps)
  const mockManifestSource = useSelector(runtime, (s) => s.mockManifestSource)
  const semanticWidgets = useSelector(runtime, (s) => s.semanticWidgets)
  const intentScript = useSelector(runtime, (s) => s.intentScript)
  const isRunning = useSelector(runtime, (s) => s.status === 'running')
  const compileError = error && error.code === 'RUNTIME_ERROR' ? error : null

  const dispatch = useDispatch(runtime)

  useEffect(() => {
    dispatch({ _tag: 'init', payload: undefined })
  }, [dispatch])

  const isReady = status === 'ready' || status === 'completed' || status === 'error'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <Header
        status={status}
        isRunning={isRunning}
        onRun={() => dispatch({ _tag: 'run', payload: undefined })}
        disabled={!isReady}
      />

      <main className="flex flex-1 overflow-hidden">
        {/* TOP: Spec Navigation & Editor Split */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* UPPER SEARCH / NAV AREA (60% height) */}
          <div className="h-[55%] flex border-b border-zinc-200 dark:border-white/5">
            {/* Left: 3-Column Spec Finder */}
            <div className="w-[65%] border-r border-zinc-200 dark:border-white/5 bg-zinc-50/30 dark:bg-zinc-900/30">
              <SpecNavigation /> {/* Removed runtime prop */}
            </div>

            {/* Right: Step Details / Intent Script Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 overflow-hidden">
              <StepDetailPanel /> {/* Removed runtime prop */}
            </div>
          </div>

          {/* LOWER RUNTIME AREA (45% height) */}
          <div className="flex-1 flex min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
            <div className="w-full flex flex-col">
              <Tabs
                activeTab={activeTab}
                onTabChange={(tab: any) => dispatch({ _tag: 'setTab', payload: tab })}
                logs={logs as any}
                traces={traces as any}
                uiIntents={uiIntents as any}
              />

              <div className="flex-1 overflow-auto p-4 scroll-smooth">
                {compileError && (
                  <AlertBox title="Compilation Failed" type="error" className="mb-4">
                    <div className="font-mono text-xs">{compileError.message}</div>
                  </AlertBox>
                )}

                {error && error.code !== 'RUNTIME_ERROR' && (
                  <AlertBox title="System Error" type="error" className="mb-4">
                    <div className="font-mono text-xs">{error.message}</div>
                  </AlertBox>
                )}

                <div className="min-h-full pb-20">
                  {activeTab === 'console' && <ConsoleView logs={logs as any} />}
                  {activeTab === 'result' && <ResultView result={runResult} />}
                  {activeTab === 'traces' && <TracesView traces={traces as any} />}
                  {activeTab === 'http' && <HttpView traces={traces as any} />}
                  {activeTab === 'ui' && (
                    <UiIntentView
                      intents={uiIntents as any}
                      scenarioId={scenarioId as string}
                      scenarioSteps={scenarioSteps as any}
                      mockManifestSource={mockManifestSource as string}
                      semanticWidgets={semanticWidgets as any}
                      onChangeScenarioId={(id) => dispatch({ _tag: 'setScenarioId', payload: id })}
                      onChangeSteps={(steps) => dispatch({ _tag: 'setScenarioSteps', payload: steps })}
                      onChangeMock={(val) => dispatch({ _tag: 'setMockManifestSource', payload: val })}
                      onEmitIntent={(packet) => {
                        dispatch({ _tag: 'addUiIntent', payload: packet })
                        dispatch({ _tag: 'uiCallbackFromMockUi', payload: packet })
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StatusBar status={status} />
    </div>
  )
}

function SandboxPlaygroundPage() {
  const runtime = useModule(SandboxImpl, {
    key: 'sandbox-root',
  })

  const status = useSelector(runtime, (s) => s.status)
  const logs = useSelector(runtime, (s) => s.logs)
  const traces = useSelector(runtime, (s) => s.traces)
  const error = useSelector(runtime, (s) => s.error)
  const runResult = useSelector(runtime, (s) => s.runResult)
  const activeTab = useSelector(runtime, (s) => s.activeTab)
  const code = useSelector(runtime, (s) => s.code)
  const uiIntents = useSelector(runtime, (s) => s.uiIntents)
  const isRunning = useSelector(runtime, (s) => s.status === 'running')
  const compileError = error && error.code === 'RUNTIME_ERROR' ? error : null

  const dispatch = useDispatch(runtime)

  useEffect(() => {
    dispatch({ _tag: 'init', payload: undefined })
  }, [dispatch])

  const isReady = status === 'ready' || status === 'completed' || status === 'error'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <Header
        status={status}
        isRunning={isRunning}
        onRun={() => dispatch({ _tag: 'run', payload: undefined })}
        disabled={!isReady}
      />

      <main className="flex flex-1 overflow-hidden">
        {/* 纯代码 Runner：左侧只有代码编辑器，右侧是运行结果 */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-white/5">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">playground.ts</span>
            </div>
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Code</div>
          </div>
          <div className="relative flex-1 bg-white dark:bg-zinc-900/30">
            <Editor code={code ?? ''} onChange={(val) => dispatch({ _tag: 'setCode', payload: val })} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-zinc-950/50">
          <Tabs
            activeTab={activeTab}
            onTabChange={(tab: any) => dispatch({ _tag: 'setTab', payload: tab })}
            logs={logs as any}
            traces={traces as any}
            uiIntents={uiIntents as any}
          />

          <div className="flex-1 overflow-auto p-4 scroll-smooth">
            {compileError && (
              <AlertBox title="Compilation Failed" type="error" className="mb-4">
                <div className="font-mono text-xs">{compileError.message}</div>
              </AlertBox>
            )}

            {error && error.code !== 'RUNTIME_ERROR' && (
              <AlertBox title="System Error" type="error" className="mb-4">
                <div className="font-mono text-xs">{error.message}</div>
              </AlertBox>
            )}

            <div className="min-h-full">
              {activeTab === 'console' && <ConsoleView logs={logs as any} />}
              {activeTab === 'result' && <ResultView result={runResult} />}
              {activeTab === 'traces' && <TracesView traces={traces as any} />}
              {activeTab === 'http' && <HttpView traces={traces as any} />}
              {activeTab === 'ui' && <UiIntentRawPanel intents={uiIntents as any} />}
            </div>
          </div>
        </div>
      </main>

      <StatusBar status={status} />
    </div>
  )
}

// ============================================================================
// Components
// ============================================================================

function Header({
  status,
  isRunning,
  onRun,
  disabled,
}: {
  status: SandboxStatus
  isRunning: boolean
  onRun: () => void
  disabled: boolean
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/5 z-20 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-white/10">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 19h20L12 2zm0 3.8L18.4 17H5.6L12 5.8zM11 8v2h2V8h-2zm0 4v4h2v-4h-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            Runtime Alignment Lab
          </h1>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-0.5">LOGIX_SANDBOX_V1</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-zinc-200 dark:bg-white/10" />

        <button
          onClick={onRun}
          disabled={disabled || isRunning}
          className={`
            relative group px-4 py-1.5 rounded-md font-medium text-xs transition-all
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-white/5 text-zinc-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 active:translate-y-0.5'
            }
          `}
        >
          <div className="flex items-center gap-2">
            {isRunning ? (
              <svg className="animate-spin h-3.5 w-3.5 opacity-90" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span>{isRunning ? 'Running...' : 'Run Scenario'}</span>
          </div>
        </button>
      </div>
    </header>
  )
}

function StatusBar({ status }: { status: SandboxStatus }) {
  const config = {
    idle: { color: 'bg-zinc-400', label: 'Ready to connect' },
    initializing: { color: 'bg-amber-500', label: 'Initializing runtime...' },
    ready: { color: 'bg-emerald-500', label: 'Worker Ready' },
    running: { color: 'bg-indigo-500', label: 'Executing...' },
    completed: { color: 'bg-emerald-500', label: 'Execution Completed' },
    error: { color: 'bg-red-500', label: 'Runtime Error' },
  }
  const { color, label } = config[status] || config.idle

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/5 text-[10px] font-mono select-none">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color} ${status === 'running' ? 'animate-pulse' : ''}`} />
        <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-tight font-semibold">{label}</span>
      </div>
      <div className="text-zinc-400 dark:text-zinc-600">Effect-TS System v3.19</div>
    </div>
  )
}

function Tabs({
  activeTab,
  onTabChange,
  logs,
  traces,
  uiIntents,
}: {
  activeTab: 'console' | 'result' | 'traces' | 'http' | 'ui'
  onTabChange: (t: any) => void
  logs: LogEntry[]
  traces: TraceSpan[]
  uiIntents: UiIntentPacket[]
}) {
  const httpCount = traces.filter((t) => t.attributes && (t.attributes as any).kind === 'http').length

  return (
    <div className="flex items-center gap-1 px-4 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900">
      {(['console', 'result', 'traces', 'http', 'ui'] as const).map((tab) => {
        const isActive = activeTab === tab
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              relative py-2.5 px-3 text-xs font-medium transition-colors
              ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span>
                {tab === 'console' && 'Terminal'}
                {tab === 'result' && 'Values'}
                {tab === 'traces' && 'Traces'}
                {tab === 'http' && 'HTTP'}
                {tab === 'ui' && 'UI Intent'}
              </span>
              {tab === 'console' && logs.length > 0 && <Badge count={logs.length} active={isActive} />}
              {tab === 'traces' && traces.length > 0 && <Badge count={traces.length} active={isActive} />}
              {tab === 'http' && httpCount > 0 && <Badge count={httpCount} active={isActive} />}
              {tab === 'ui' && uiIntents.length > 0 && <Badge count={uiIntents.length} active={isActive} />}
            </div>
            {isActive && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 dark:bg-indigo-500" />}
          </button>
        )
      })}
    </div>
  )
}

function Badge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`
      px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none
      ${active ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-white/10 text-zinc-500'}
    `}
    >
      {count}
    </span>
  )
}

function ScenarioBuilder({
  scenarioId,
  steps,
  mockManifestSource,
  semanticWidgets,
  intentScript,
  onChangeScenarioId,
  onChangeSteps,
  onChangeMock,
  onChangeWidgets,
  onChangeIntentScript,
}: {
  scenarioId: string
  steps: ScenarioStep[]
  mockManifestSource: string
  semanticWidgets: any[]
  intentScript: string
  onChangeScenarioId: (id: string) => void
  onChangeSteps: (steps: ScenarioStep[]) => void
  onChangeMock: (value: string) => void
  onChangeWidgets: (widgets: any[]) => void
  onChangeIntentScript: (value: string) => void
}) {
  const addStep = () => {
    const nextId = String((steps.length ? Number(steps[steps.length - 1].stepId) : 0) + 1)
    onChangeSteps([...steps, { stepId: nextId, label: `Step ${nextId}` }])
  }
  const removeStep = (idx: number) => {
    if (steps.length <= 1) return
    const next = [...steps.slice(0, idx), ...steps.slice(idx + 1)]
    onChangeSteps(next)
  }

  const addWidget = () => {
    const id = `widget-${Date.now()}`
    onChangeWidgets([
      ...semanticWidgets,
      { id, type: 'select', label: '下拉', field: 'field', stepId: '1', optionsJson: JSON.stringify([], null, 2) },
    ])
  }
  const updateWidget = (idx: number, updates: Partial<any>) => {
    const next = [...semanticWidgets]
    next[idx] = { ...next[idx], ...updates }
    onChangeWidgets(next)
  }
  const removeWidget = (idx: number) => {
    const next = [...semanticWidgets.slice(0, idx), ...semanticWidgets.slice(idx + 1)]
    onChangeWidgets(next)
  }

  const parseIntentScript = () => {
    if (!intentScript.trim()) return
    const lines = intentScript
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const nextSteps: ScenarioStep[] = []
    const nextWidgets: any[] = []
    let stepCounter = 1
    for (const line of lines) {
      // 简易语法：/select <field> <label> [options=json]
      if (line.startsWith('/select')) {
        const parts = line.split(' ').filter(Boolean)
        const field = parts[1] ?? `field${stepCounter}`
        const label = parts[2] ?? `选择 ${field}`
        const optionsJson = parts.slice(3).join(' ') || '[]'
        const stepId = String(stepCounter++)
        nextSteps.push({ stepId, label })
        nextWidgets.push({
          id: `widget-${field}-${Date.now()}`,
          type: 'select',
          label,
          field,
          stepId,
          optionsJson,
        })
      } else if (line.startsWith('/button')) {
        const parts = line.split(' ').filter(Boolean)
        const label = parts[1] ?? `按钮 ${stepCounter}`
        const stepId = String(stepCounter++)
        nextSteps.push({ stepId, label })
        nextWidgets.push({
          id: `btn-${Date.now()}`,
          type: 'button',
          label,
          field: 'button',
          stepId,
          optionsJson: '[]',
        })
      } else {
        const stepId = String(stepCounter++)
        nextSteps.push({ stepId, label: line })
      }
    }
    onChangeSteps(nextSteps)
    onChangeWidgets(nextWidgets)
    if (!scenarioId) {
      onChangeScenarioId('Scenario-' + Date.now())
    }
  }

  return (
    <div className="border-b border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-mono">
            Scenario
          </span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">RegionSelector · 省市区联动</span>
        </div>
        <input
          className="text-[10px] font-mono px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 w-56"
          value={scenarioId}
          onChange={(e) => onChangeScenarioId(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => (
          <div key={step.stepId} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">step {step.stepId}</span>
            <input
              className="flex-1 text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100"
              value={step.label}
              onChange={(e) => {
                const next = [...steps]
                next[idx] = { ...next[idx], label: e.target.value }
                onChangeSteps(next)
              }}
            />
            <button
              onClick={() => removeStep(idx)}
              className="text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-red-500 disabled:opacity-40"
              disabled={steps.length <= 1}
            >
              删除
            </button>
          </div>
        ))}
        <button
          onClick={addStep}
          className="text-[10px] px-2 py-1 rounded border border-dashed border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300"
        >
          + 添加 Step
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Mock Manifest（JSON）</div>
        <textarea
          className="w-full h-36 text-[11px] font-mono px-2 py-2 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 resize-none"
          value={mockManifestSource}
          onChange={(e) => onChangeMock(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
          意图脚本（支持 /select /button）
        </div>
        <textarea
          className="w-full h-28 text-[11px] font-mono px-2 py-2 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 resize-none"
          value={intentScript}
          onChange={(e) => onChangeIntentScript(e.target.value)}
          placeholder={
            '/select province 选择省份 [{"code":"44","name":"广东"}]\n' + '/select city 选择城市 []\n' + '/button 提交'
          }
          spellCheck={false}
        />
        <button
          onClick={parseIntentScript}
          className="text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300"
        >
          从脚本生成步骤与语义组件
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">语义 UI 组件（Mock UI 可交互）</div>
        {semanticWidgets.map((w, idx) => (
          <div
            key={w.id}
            className="p-2 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800/60 space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">{w.type}</span>
              <input
                className="text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100"
                value={w.label}
                onChange={(e) => updateWidget(idx, { label: e.target.value })}
                placeholder="标签"
              />
              <input
                className="text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100"
                value={w.field}
                onChange={(e) => updateWidget(idx, { field: e.target.value })}
                placeholder="字段"
              />
              <input
                className="text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100 w-20"
                value={w.stepId}
                onChange={(e) => updateWidget(idx, { stepId: e.target.value })}
                placeholder="StepId"
              />
              <button
                className="text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-red-500"
                onClick={() => removeWidget(idx)}
              >
                删除
              </button>
            </div>
            <textarea
              className="w-full h-20 text-[11px] font-mono px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100"
              value={w.optionsJson}
              onChange={(e) => updateWidget(idx, { optionsJson: e.target.value })}
              placeholder='[{ "code": "1", "name": "选项" }]'
            />
          </div>
        ))}
        <button
          onClick={addWidget}
          className="text-[10px] px-2 py-1 rounded border border-dashed border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300"
        >
          + 添加语义组件
        </button>
      </div>
    </div>
  )
}

function MockUiPreview({
  intents,
  scenarioId,
  semanticWidgets,
  onEmitIntent,
}: {
  intents: UiIntentPacket[]
  scenarioId?: string
  semanticWidgets?: any[]
  onEmitIntent?: (packet: UiIntentPacket) => void
}) {
  const widgets = semanticWidgets ?? []

  const latestValueByField = (field: string): string => {
    const latest = [...intents].reverse().find((i) => (i.props as any)?.field === field)
    return typeof (latest?.props as any)?.value === 'string' ? ((latest?.props as any)?.value as string) : ''
  }

  const emit = (widget: any, value: string, displayLabel?: string) => {
    if (!onEmitIntent) return

    const field = widget.field as string
    const label = displayLabel ?? widget.label ?? ''

    const packet: UiIntentPacket = {
      id: `${widget.id}-${Date.now()}`,
      component: widget.type === 'button' ? 'SemanticButton' : 'SemanticSelect',
      intent: 'action',
      props: {
        field,
        value,
        label,
        widgetId: widget.id,
        stepId: widget.stepId,
      },
      callbacks: [widget.type === 'button' ? 'onClick' : 'onChange'],
      children: [],
      meta: {
        storyId: scenarioId || 'Scenario',
        stepId: String(widget.stepId ?? ''),
        label: label || widget.label || '',
        severity: 'info',
        tags: ['mock-ui'],
      },
    }
    onEmitIntent(packet)
  }

  const parseOptions = (widget: any): Array<{ value: string; label: string }> => {
    try {
      const raw = JSON.parse(widget.optionsJson || '[]')
      if (!Array.isArray(raw)) return []
      return raw.map((item: any) => {
        const value = String(item.code ?? item.value ?? '')
        const label = String(item.name ?? item.label ?? value)
        return { value, label }
      })
    } catch {
      return []
    }
  }

  return (
    <div className="rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-3 space-y-2">
      <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Mock UI Preview</div>
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
        根据「语义 UI 组件」配置生成的线框 UI，点击后会通过 UI_INTENT 协议记录交互行为（不依赖真实业务页面）。
      </div>
      {widgets.length === 0 ? (
        <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
          尚未配置任何语义组件。可以在左侧「语义 UI 组件」面板或通过意图脚本添加 /select、/button
          等组件后，在这里预览交互。
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {widgets.map((w) => {
            if (w.type === 'button') {
              return (
                <button
                  key={w.id}
                  type="button"
                  className="px-3 py-1.5 text-[12px] rounded border border-zinc-200 dark:border-white/10 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-400"
                  onClick={() => emit(w, 'clicked', w.label)}
                  disabled={!onEmitIntent}
                >
                  {w.label || '按钮'}
                </button>
              )
            }

            const options = parseOptions(w)
            const value = latestValueByField(w.field)

            return (
              <div key={w.id} className="flex-1 min-w-[180px] space-y-1">
                <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                  {w.label || w.field || 'Select'}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value
                      const item = options.find((o) => o.value === v)
                      emit(w, v, item?.label ?? '')
                    }}
                    disabled={!onEmitIntent}
                    className="w-full px-2 py-1.5 text-[12px] rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100"
                  >
                    <option value="">（未选择）</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {value ? 'from UI_INTENT' : onEmitIntent ? 'click to emit' : 'readonly'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AlertBox({ title, type, children, className }: any) {
  const styles =
    type === 'error'
      ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
      : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'

  return (
    <div className={`p-3 rounded-md border ${styles} ${className}`}>
      <div className="flex items-center gap-2 mb-1 font-semibold text-xs uppercase tracking-wider opacity-90">
        {title}
      </div>
      {children}
    </div>
  )
}

function ConsoleView({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) return <EmptyState label="No logs emitted" />

  return (
    <div className="font-mono text-xs space-y-1">
      {logs.map((log, i) => (
        <div
          key={i}
          className="flex items-start gap-3 py-1 border-b border-dashed border-zinc-100 dark:border-white/5 last:border-0"
        >
          <span className="text-zinc-400 dark:text-zinc-600 select-none min-w-[60px]">
            {
              new Date(log.timestamp)
                .toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                .split(' ')[0]
            }
          </span>
          <div className="flex-1 break-words">
            <span
              className={`
               inline-block mr-2 font-bold text-[10px] uppercase tracking-wider
               ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-blue-500'}
             `}
            >
              {log.level}
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {log.args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ResultView({ result }: { result: any }) {
  if (result === undefined || result === null) return <EmptyState label="Run program to see result" />

  return (
    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-white/5">
      <pre className="font-mono text-xs text-zinc-700 dark:text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

function TracesView({ traces }: { traces: TraceSpan[] }) {
  if (traces.length === 0) return <EmptyState label="No trace spans captured" />

  return (
    <div className="space-y-2">
      {traces.map((t, i) => {
        const duration = t.endTime && t.startTime > 0 ? t.endTime - t.startTime : 0
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 bg-white dark:bg-white/[0.02] rounded border border-zinc-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-white/10 transition-colors"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                  {t.name || t.spanId}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] rounded-sm bg-zinc-100 dark:bg-white/10 text-zinc-500 font-mono">
                  {t.spanId.slice(0, 6)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {duration > 0 && <span className="text-[10px] font-mono text-zinc-400">{duration}ms</span>}
              <span
                className={`
                px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider
                ${
                  t.status === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : t.status === 'error'
                      ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                }
              `}
              >
                {t.status}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HttpView({ traces }: { traces: TraceSpan[] }) {
  const httpTraces = traces.filter((t) => (t.attributes as any)?.kind === 'http')
  if (httpTraces.length === 0) return <EmptyState label="No HTTP calls captured" />

  return (
    <div className="space-y-2">
      {httpTraces.map((t) => {
        const attrs = (t.attributes ?? {}) as any
        const duration = t.endTime && t.startTime > 0 ? t.endTime - t.startTime : 0
        return (
          <div
            key={t.spanId}
            className="rounded border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    attrs.mode === 'mock'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  }`}
                >
                  {attrs.mode === 'mock' ? 'Mock' : 'Real'}
                </span>
                <span className="font-mono">{attrs.method ?? 'GET'}</span>
              </div>
              <div className="font-mono">{duration > 0 ? `${duration} ms` : ''}</div>
            </div>
            <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">{attrs.url ?? t.name}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">
              status {attrs.status ?? 0} {attrs.delayMs ? `· delay ${attrs.delayMs}ms` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type ScenarioStep = { stepId: string; label: string }

function UiIntentView({
  intents,
  scenarioId,
  scenarioSteps,
  mockManifestSource,
  semanticWidgets,
  onChangeScenarioId,
  onChangeSteps,
  onChangeMock,
  onEmitIntent,
}: {
  intents: UiIntentPacket[]
  scenarioId: string
  scenarioSteps: ScenarioStep[]
  mockManifestSource: string
  semanticWidgets: any[]
  onChangeScenarioId: (id: string) => void
  onChangeSteps: (steps: ScenarioStep[]) => void
  onChangeMock: (value: string) => void
  onEmitIntent: (packet: UiIntentPacket) => void
}) {
  if (!intents || intents.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-mono">
                Scenario
              </span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                {scenarioId || '未命名场景'}
              </span>
            </div>
            <input
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 w-52"
              value={scenarioId}
              onChange={(e) => onChangeScenarioId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            {scenarioSteps.map((step, idx) => (
              <div key={step.stepId} className="flex items-center justify-between text-[11px] gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">step {step.stepId}</span>
                  <input
                    className="flex-1 min-w-[160px] text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100"
                    value={step.label}
                    onChange={(e) => {
                      const next = [...scenarioSteps]
                      next[idx] = { ...next[idx], label: e.target.value }
                      onChangeSteps(next)
                    }}
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  pending
                </span>
              </div>
            ))}
          </div>
        </div>
        <MockUiPreview
          intents={intents}
          scenarioId={scenarioId}
          semanticWidgets={semanticWidgets}
          onEmitIntent={onEmitIntent}
        />
        <EmptyState label="No UI_INTENT emitted" />
      </div>
    )
  }

  const stepCoverage = scenarioSteps.map((step) => ({
    ...step,
    hit: intents.some((intent) => intent.meta?.storyId === scenarioId && intent.meta?.stepId === step.stepId),
  }))

  const updateStepLabel = (index: number, label: string) => {
    const next = [...scenarioSteps]
    next[index] = { ...next[index], label }
    onChangeSteps(next)
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-mono">
              Scenario
            </span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{scenarioId || '未命名场景'}</span>
          </div>
          <input
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 w-52"
            value={scenarioId}
            onChange={(e) => onChangeScenarioId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          {stepCoverage.map((step, idx) => (
            <div key={step.stepId} className="flex items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">step {step.stepId}</span>
                <input
                  className="flex-1 min-w-[160px] text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100"
                  value={step.label}
                  onChange={(e) => updateStepLabel(idx, e.target.value)}
                />
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                  step.hit
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {step.hit ? 'covered' : 'pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <MockUiPreview
        intents={intents}
        scenarioId={scenarioId}
        semanticWidgets={semanticWidgets}
        onEmitIntent={onEmitIntent}
      />

      {intents.map((intent) => (
        <div
          key={intent.id}
          className="rounded border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 text-[10px] font-semibold uppercase">
                {intent.component}
              </span>
              <span className="font-mono">{intent.intent}</span>
              {intent.meta?.label && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                  {intent.meta.label}
                </span>
              )}
            </div>
            <div className="text-right space-y-0.5">
              {intent.meta?.storyId && (
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  {intent.meta.storyId}
                  {intent.meta.stepId ? ` · step ${intent.meta.stepId}` : ''}
                </div>
              )}
              <div className="text-[10px] font-mono text-zinc-400">#{intent.id}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            callbacks: {intent.callbacks?.length ? intent.callbacks.join(', ') : '—'}
          </div>
          {intent.children && intent.children.length > 0 && (
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              children: {intent.children.map((c) => c.component).join(', ')}
            </div>
          )}
          <pre className="mt-2 text-[11px] bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-200 rounded-md p-2 overflow-auto">
            {JSON.stringify(intent.props ?? {}, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

function UiIntentRawPanel({ intents }: { intents: UiIntentPacket[] }) {
  if (!intents || intents.length === 0) {
    return <EmptyState label="No UI_INTENT emitted" />
  }

  return (
    <div className="space-y-3">
      {intents.map((intent) => (
        <div
          key={intent.id}
          className="rounded border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 text-[10px] font-semibold uppercase">
                {intent.component}
              </span>
              <span className="font-mono">{intent.intent}</span>
            </div>
            <div className="text-right space-y-0.5">
              {intent.meta?.storyId && (
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  {intent.meta.storyId}
                  {intent.meta.stepId ? ` · step ${intent.meta.stepId}` : ''}
                </div>
              )}
              <div className="text-[10px] font-mono text-zinc-400">#{intent.id}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            callbacks: {intent.callbacks?.length ? intent.callbacks.join(', ') : '—'}
          </div>
          <pre className="mt-2 text-[11px] bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-200 rounded-md p-2 overflow-auto">
            {JSON.stringify(intent.props ?? {}, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-300 dark:text-zinc-700">
      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
