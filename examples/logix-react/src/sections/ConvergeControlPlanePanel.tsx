import React from 'react'
import * as Logix from '@logix/core'
import type { Layer } from 'effect'

type RequestedMode = 'auto' | 'full' | 'dirty'
type Select<T extends string> = T | 'inherit'

type StateTransactionOverrides = Parameters<typeof Logix.Runtime.stateTransactionOverridesLayer>[0]
type ModuleOverridesById = NonNullable<StateTransactionOverrides['traitConvergeOverridesByModuleId']>

let nextRowKey = 0

const parsePositiveNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

type ModuleOverrideRow = {
  readonly key: string
  readonly moduleId: string
  readonly mode: Select<RequestedMode>
  readonly decisionBudgetMs: string
  readonly budgetMs: string
}

const newRow = (): ModuleOverrideRow => ({
  key: `row-${++nextRowKey}`,
  moduleId: '',
  mode: 'inherit',
  decisionBudgetMs: '',
  budgetMs: '',
})

export type ConvergeControlPlaneChange = {
  readonly layer?: Layer.Layer<any, any, never>
  readonly overrides?: StateTransactionOverrides
}

export const ConvergeControlPlanePanel: React.FC<{
  readonly knownModuleIds?: ReadonlyArray<string>
  readonly onChange?: (change: ConvergeControlPlaneChange) => void
}> = ({ knownModuleIds = [], onChange }) => {
  const [providerMode, setProviderMode] = React.useState<Select<RequestedMode>>('inherit')
  const [providerDecisionBudgetMs, setProviderDecisionBudgetMs] = React.useState<string>('')
  const [providerBudgetMs, setProviderBudgetMs] = React.useState<string>('')
  const [rows, setRows] = React.useState<ReadonlyArray<ModuleOverrideRow>>([])

  const overrides = React.useMemo<StateTransactionOverrides | undefined>(() => {
    const provider: Record<string, unknown> = {}

    if (providerMode !== 'inherit') provider.traitConvergeMode = providerMode
    const decisionBudgetMs = parsePositiveNumber(providerDecisionBudgetMs)
    if (decisionBudgetMs != null) provider.traitConvergeDecisionBudgetMs = decisionBudgetMs
    const budgetMs = parsePositiveNumber(providerBudgetMs)
    if (budgetMs != null) provider.traitConvergeBudgetMs = budgetMs

    const byId: Record<string, unknown> = {}
    for (const r of rows) {
      const moduleId = r.moduleId.trim()
      if (!moduleId) continue

      const patch: Record<string, unknown> = {}
      if (r.mode !== 'inherit') patch.traitConvergeMode = r.mode
      const d = parsePositiveNumber(r.decisionBudgetMs)
      if (d != null) {
        patch.traitConvergeDecisionBudgetMs = d
      }
      const b = parsePositiveNumber(r.budgetMs)
      if (b != null) {
        patch.traitConvergeBudgetMs = b
      }

      if (Object.keys(patch).length === 0) continue
      byId[moduleId] = patch
    }

    const out: Record<string, unknown> = {
      ...provider,
      ...(Object.keys(byId).length > 0 ? { traitConvergeOverridesByModuleId: byId } : null),
    }

    return Object.keys(out).length > 0 ? (out as unknown as StateTransactionOverrides) : undefined
  }, [providerMode, providerDecisionBudgetMs, providerBudgetMs, rows])

  const layer = React.useMemo<Layer.Layer<any, any, never> | undefined>(() => {
    if (!overrides) return undefined
    return Logix.Runtime.stateTransactionOverridesLayer(overrides) as unknown as Layer.Layer<any, any, never>
  }, [overrides])

  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  React.useEffect(() => {
    onChangeRef.current?.({ layer, overrides })
  }, [layer, overrides])

  const providerSummary = React.useMemo(() => {
    const parts: string[] = []
    parts.push(`mode=${providerMode === 'inherit' ? '（跟随默认）' : providerMode}`)
    parts.push(
      `decisionBudgetMs=${
        parsePositiveNumber(providerDecisionBudgetMs) != null ? providerDecisionBudgetMs.trim() : '（跟随默认）'
      }`,
    )
    parts.push(`budgetMs=${parsePositiveNumber(providerBudgetMs) != null ? providerBudgetMs.trim() : '（跟随默认）'}`)
    return parts.join(' · ')
  }, [providerMode, providerDecisionBudgetMs, providerBudgetMs])

  const moduleSummary = React.useMemo(() => {
    if (!overrides?.traitConvergeOverridesByModuleId) return '（无）'
    const entries = Object.entries(overrides.traitConvergeOverridesByModuleId)
    if (entries.length === 0) return '（无）'
    return entries
      .map(([moduleId, patch]) => {
        const parts: string[] = []
        if (patch.traitConvergeMode) parts.push(`mode=${patch.traitConvergeMode}`)
        if (typeof patch.traitConvergeDecisionBudgetMs === 'number')
          parts.push(`decisionBudgetMs=${String(patch.traitConvergeDecisionBudgetMs)}`)
        if (typeof patch.traitConvergeBudgetMs === 'number')
          parts.push(`budgetMs=${String(patch.traitConvergeBudgetMs)}`)
        return `${moduleId}: ${parts.length > 0 ? parts.join(', ') : '（空 patch）'}`
      })
      .join('；')
  }, [overrides?.traitConvergeOverridesByModuleId])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">013 控制面 · Converge 调参面板</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-3xl leading-relaxed">
            这里注入的是 <span className="font-mono">Provider</span> 范围的覆盖（优先级最高）：
            你改动后会在“下一笔事务”生效，适合做页面级调参/止血，不需要改库默认值。
          </p>
        </div>
        <div className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          Provider override
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Requested Mode</div>
          <select
            value={providerMode}
            onChange={(e) => setProviderMode(e.target.value as any)}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          >
            <option value="inherit">跟随默认（不覆盖）</option>
            <option value="auto">auto（可降级/自我保护）</option>
            <option value="dirty">dirty（最小触发）</option>
            <option value="full">full（最稳妥/止血）</option>
          </select>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            auto/dirty/full 是 <span className="font-mono">requestedMode</span>；在 Devtools 的{' '}
            <span className="font-mono">traitSummary.converge</span> 可看到实际{' '}
            <span className="font-mono">executedMode</span>。
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Decision Budget (ms)</div>
          <input
            type="number"
            inputMode="decimal"
            step={0.25}
            min={0}
            placeholder="（跟随默认）"
            value={providerDecisionBudgetMs}
            onChange={(e) => setProviderDecisionBudgetMs(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {[0.25, 0.5, 1, 2].map((v) => (
              <button
                key={String(v)}
                type="button"
                className="px-2 py-1 rounded border text-[11px] font-mono bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setProviderDecisionBudgetMs(String(v))}
              >
                {String(v)}
              </button>
            ))}
            <button
              type="button"
              className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setProviderDecisionBudgetMs('')}
            >
              清空
            </button>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            仅对 <span className="font-mono">requestedMode=auto</span> 生效；超时会触发止损回退。
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Execution Budget (ms)</div>
          <input
            type="number"
            inputMode="decimal"
            step={50}
            min={0}
            placeholder="（跟随默认）"
            value={providerBudgetMs}
            onChange={(e) => setProviderBudgetMs(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {[50, 100, 200, 500].map((v) => (
              <button
                key={String(v)}
                type="button"
                className="px-2 py-1 rounded border text-[11px] font-mono bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setProviderBudgetMs(String(v))}
              >
                {String(v)}
              </button>
            ))}
            <button
              type="button"
              className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setProviderBudgetMs('')}
            >
              清空
            </button>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            超预算会软降级（冻结派生字段），用于保住事务 0/1 commit 语义。
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">模块级覆盖（可选）</div>
          <button
            type="button"
            className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setRows((prev) => [...prev, newRow()])}
          >
            添加 module patch
          </button>
        </div>

        {knownModuleIds.length > 0 ? (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            常用 moduleId：
            {knownModuleIds.map((x) => (
              <span key={x} className="font-mono mr-2">
                {x}
              </span>
            ))}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div
                key={r.key}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3"
              >
                <input
                  value={r.moduleId}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, moduleId: e.target.value } : x)))
                  }
                  placeholder="moduleId（例如 OrderForm）"
                  className="md:col-span-2 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono"
                />
                <select
                  value={r.mode}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, mode: e.target.value as any } : x)))
                  }
                  className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="inherit">不覆盖</option>
                  <option value="auto">auto</option>
                  <option value="dirty">dirty</option>
                  <option value="full">full</option>
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.25}
                  min={0}
                  value={r.decisionBudgetMs}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) => (x.key === r.key ? { ...x, decisionBudgetMs: e.target.value } : x)),
                    )
                  }
                  placeholder="decisionBudgetMs"
                  className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={50}
                    min={0}
                    value={r.budgetMs}
                    onChange={(e) =>
                      setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, budgetMs: e.target.value } : x)))
                    }
                    placeholder="budgetMs"
                    className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono"
                  />
                  <button
                    type="button"
                    className="px-2 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    aria-label={`remove module override ${String(idx + 1)}`}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            适合做“只对某个模块止血回退 full”，其它模块继续走默认策略。
          </div>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-200">
        <div className="font-semibold text-[11px] text-gray-600 dark:text-gray-300 mb-1">当前覆盖摘要</div>
        <div className="text-[11px]">
          Provider：<span className="font-mono">{providerSummary}</span>
        </div>
        <div className="text-[11px] mt-1">
          模块：<span className="font-mono">{moduleSummary}</span>
        </div>
      </div>
    </div>
  )
}
