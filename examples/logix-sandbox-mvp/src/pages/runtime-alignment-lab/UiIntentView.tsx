import { type UiIntentPacket } from '@logix/sandbox'
import { EmptyState } from '../_shared/SandboxShell'
import type { SandboxState } from '../../modules/SandboxRuntime'

export type ScenarioStep = SandboxState['scenarioSteps'][number]
export type SemanticWidget = SandboxState['semanticWidgets'][number]

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
  steps: ReadonlyArray<ScenarioStep>
  mockManifestSource: string
  semanticWidgets: ReadonlyArray<SemanticWidget>
  intentScript: string
  onChangeScenarioId: (id: string) => void
  onChangeSteps: (steps: ReadonlyArray<ScenarioStep>) => void
  onChangeMock: (value: string) => void
  onChangeWidgets: (widgets: ReadonlyArray<SemanticWidget>) => void
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
      {
        id,
        type: 'select',
        label: '下拉',
        field: 'field',
        stepId: '1',
        optionsJson: JSON.stringify([], null, 2),
      },
    ])
  }
  const updateWidget = (idx: number, updates: Partial<SemanticWidget>) => {
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
    const nextWidgets: Array<SemanticWidget> = []
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
  intents: ReadonlyArray<UiIntentPacket>
  scenarioId?: string
  semanticWidgets?: ReadonlyArray<SemanticWidget>
  onEmitIntent?: (packet: UiIntentPacket) => void
}) {
  const widgets = semanticWidgets ?? []

  const latestValueByField = (field: string): string => {
    for (let i = intents.length - 1; i >= 0; i--) {
      const intent = intents[i]!
      const intentField = intent.props?.field
      if (typeof intentField !== 'string' || intentField !== field) continue
      const value = intent.props?.value
      return typeof value === 'string' ? value : ''
    }
    return ''
  }

  const emit = (widget: SemanticWidget, value: string, displayLabel?: string) => {
    if (!onEmitIntent) return

    const field = widget.field
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

  const parseOptions = (widget: SemanticWidget): Array<{ value: string; label: string }> => {
    try {
      const raw: unknown = JSON.parse(widget.optionsJson || '[]')
      if (!Array.isArray(raw)) return []
      return raw.map((item) => {
        const record: Record<string, unknown> =
          typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}
        const value = String(record.code ?? record.value ?? '')
        const label = String(record.name ?? record.label ?? value)
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

export function UiIntentView({
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
  intents: ReadonlyArray<UiIntentPacket>
  scenarioId: string
  scenarioSteps: ReadonlyArray<ScenarioStep>
  mockManifestSource: string
  semanticWidgets: ReadonlyArray<SemanticWidget>
  onChangeScenarioId: (id: string) => void
  onChangeSteps: (steps: ReadonlyArray<ScenarioStep>) => void
  onChangeMock: (value: string) => void
  onEmitIntent: (packet: UiIntentPacket) => void
}) {
  void mockManifestSource
  void onChangeMock
  void ScenarioBuilder

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
