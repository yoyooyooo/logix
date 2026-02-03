import React from 'react'
import * as Logix from '@logixjs/core'

import { getPlatformVizModule, platformVizModules } from './fixtures'
import { ErrorBanner, JsonPanel } from './shared'

type ModuleManifest = ReturnType<typeof Logix.Reflection.extractManifest>

const toMaxBytes = (raw: string): number | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

const countRecord = (value: unknown): number => (value && typeof value === 'object' ? Object.keys(value as any).length : 0)

export const ManifestInspector: React.FC = () => {
  const [moduleId, setModuleId] = React.useState<string>(platformVizModules[0]!.id)
  const [includeStaticIr, setIncludeStaticIr] = React.useState(false)
  const [maxBytesInput, setMaxBytesInput] = React.useState('')

  const [manifest, setManifest] = React.useState<ModuleManifest | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const item = getPlatformVizModule(moduleId)
    const maxBytes = toMaxBytes(maxBytesInput)
    const options: Parameters<typeof Logix.Reflection.extractManifest>[1] = {
      includeStaticIr,
      ...(typeof maxBytes === 'number' ? { budgets: { maxBytes } } : null),
    }

    try {
      const next = Logix.Reflection.extractManifest(item.module, options)
      setManifest(next)
      setError(null)
    } catch (e) {
      setManifest(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [moduleId, includeStaticIr, maxBytesInput])

  const selected = getPlatformVizModule(moduleId)

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manifest Inspector</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          选择预置模块并调用 `Logix.Reflection.extractManifest`。输出支持 `includeStaticIr` 与 `budgets.maxBytes`（裁剪会通过
          `meta.__logix` 标记）。
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              Module
            </div>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
            >
              {platformVizModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              budgets.maxBytes（可选）
            </div>
            <input
              value={maxBytesInput}
              onChange={(e) => setMaxBytesInput(e.target.value)}
              placeholder="例如 1500"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-mono"
            />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">为空表示不裁剪。</div>
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={includeStaticIr}
              onChange={(e) => setIncludeStaticIr(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            <div className="text-sm text-gray-700 dark:text-gray-200">includeStaticIr</div>
          </label>
        </div>
      </div>

      {error ? <ErrorBanner title="extractManifest 失败" detail={error} /> : null}

      {manifest ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">摘要</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                <div>
                  <span className="font-semibold">moduleId:</span> <span className="font-mono">{manifest.moduleId}</span>
                </div>
                <div>
                  <span className="font-semibold">manifestVersion:</span>{' '}
                  <span className="font-mono">{manifest.manifestVersion}</span>
                </div>
                <div>
                  <span className="font-semibold">digest:</span> <span className="font-mono break-all">{manifest.digest}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">actions</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{manifest.actionKeys.length}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">schemas</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{manifest.schemaKeys?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">logicUnits</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{manifest.logicUnits?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">servicePorts</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{manifest.servicePorts?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">slots</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{countRecord(manifest.slots)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">slotFills</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{countRecord(manifest.slotFills)}</div>
              </div>
            </div>
          </div>

          {manifest.meta && (manifest.meta as any).__logix ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm">
              <div className="font-semibold text-amber-800 dark:text-amber-200">输出已裁剪（meta.__logix）</div>
              <div className="mt-1 text-amber-800/80 dark:text-amber-200/80 text-xs font-mono break-words">
                {JSON.stringify((manifest.meta as any).__logix)}
              </div>
            </div>
          ) : null}

          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-xs text-gray-700 dark:text-gray-200">
            <div className="font-semibold text-gray-900 dark:text-white">缺失/未开启提示</div>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {manifest.servicePorts === undefined ? (
                <li>
                  `servicePorts` 未提供：通常表示模块未声明 `Module.make(..., {'{ services: {...} }'})`；也可用 `084 SpyEvidence`
                  辅助发现缺口。
                </li>
              ) : null}
              {manifest.slots === undefined || manifest.slotFills === undefined ? (
                <li>`slots/slotFills` 未提供：模块未声明 `slots` 或逻辑未设置 `slotName`（083）。</li>
              ) : null}
              {!manifest.staticIr && includeStaticIr ? <li>`staticIr` 未导出：模块可能未使用 StateTrait。</li> : null}
              {!manifest.staticIr && !includeStaticIr ? <li>`staticIr` 默认关闭；勾选 includeStaticIr 可导出。</li> : null}
              {manifest.servicePorts !== undefined &&
              manifest.slots !== undefined &&
              manifest.slotFills !== undefined &&
              (!!manifest.staticIr || !includeStaticIr) ? (
                <li>当前模块未发现缺失项。</li>
              ) : null}
            </ul>
          </div>

          <JsonPanel title={`Raw JSON（${selected.title}）`} value={manifest} />
        </div>
      ) : null}
    </div>
  )
}
