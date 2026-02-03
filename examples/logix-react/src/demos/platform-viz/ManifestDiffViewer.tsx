import React from 'react'
import * as Logix from '@logixjs/core'

import { getPlatformVizModule, platformVizModules } from './fixtures'
import { ErrorBanner, JsonPanel } from './shared'

type InputMode = 'module' | 'json'

type ModuleManifest = ReturnType<typeof Logix.Reflection.extractManifest>
type ModuleManifestDiff = ReturnType<typeof Logix.Reflection.diffManifest>

const parseManifestJson = (
  input: string,
): { readonly ok: true; readonly value: ModuleManifest } | { readonly ok: false; readonly error: string } => {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'JSON 为空' }
  try {
    const raw = JSON.parse(trimmed)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'JSON 不是对象' }
    }
    const moduleId = (raw as any).moduleId
    const digest = (raw as any).digest
    if (typeof moduleId !== 'string' || moduleId.length === 0) {
      return { ok: false, error: '缺少 moduleId:string' }
    }
    if (typeof digest !== 'string' || digest.length === 0) {
      return { ok: false, error: '缺少 digest:string' }
    }
    return { ok: true, value: raw as ModuleManifest }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const toMaxBytes = (raw: string): number | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

export const ManifestDiffViewer: React.FC = () => {
  const [includeStaticIr, setIncludeStaticIr] = React.useState(false)
  const [maxBytesInput, setMaxBytesInput] = React.useState('')

  const [beforeMode, setBeforeMode] = React.useState<InputMode>('module')
  const [afterMode, setAfterMode] = React.useState<InputMode>('module')

  const [beforeModuleId, setBeforeModuleId] = React.useState<string>(platformVizModules[0]!.id)
  const [afterModuleId, setAfterModuleId] = React.useState<string>(platformVizModules[0]!.id)

  const [beforeJson, setBeforeJson] = React.useState<string>('')
  const [afterJson, setAfterJson] = React.useState<string>('')

  const [diff, setDiff] = React.useState<ModuleManifestDiff | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const onCompute = React.useCallback(() => {
    setError(null)
    setDiff(null)

    const maxBytes = toMaxBytes(maxBytesInput)
    const options: Parameters<typeof Logix.Reflection.extractManifest>[1] = {
      includeStaticIr,
      ...(typeof maxBytes === 'number' ? { budgets: { maxBytes } } : null),
    }

    const resolveOne = (
      side: 'before' | 'after',
    ): { readonly ok: true; readonly value: ModuleManifest } | { readonly ok: false; readonly error: string } => {
      const mode = side === 'before' ? beforeMode : afterMode
      if (mode === 'json') {
        return parseManifestJson(side === 'before' ? beforeJson : afterJson)
      }

      const modId = side === 'before' ? beforeModuleId : afterModuleId
      const item = getPlatformVizModule(modId)
      try {
        return { ok: true, value: Logix.Reflection.extractManifest(item.module, options) }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }

    const before = resolveOne('before')
    if (!before.ok) {
      setError(`before 解析失败：${before.error}`)
      return
    }
    const after = resolveOne('after')
    if (!after.ok) {
      setError(`after 解析失败：${after.error}`)
      return
    }

    try {
      const next = Logix.Reflection.diffManifest(before.value, after.value)
      setDiff(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [afterJson, afterMode, afterModuleId, beforeJson, beforeMode, beforeModuleId, includeStaticIr, maxBytesInput])

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manifest Diff Viewer</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            before/after 支持“模块选择”或“JSON 粘贴”。模块模式会共用同一组选项（includeStaticIr / maxBytes），以减少噪音 diff。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={includeStaticIr}
              onChange={(e) => setIncludeStaticIr(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            <div className="text-sm text-gray-700 dark:text-gray-200">includeStaticIr</div>
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

          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={onCompute}
              className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              计算 diff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">before</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setBeforeMode('module')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  beforeMode === 'module'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700'
                }`}
              >
                模块
              </button>
              <button
                type="button"
                onClick={() => setBeforeMode('json')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  beforeMode === 'json'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700'
                }`}
              >
                JSON
              </button>
            </div>

            {beforeMode === 'module' ? (
              <select
                value={beforeModuleId}
                onChange={(e) => setBeforeModuleId(e.target.value)}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
              >
                {platformVizModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            ) : (
              <textarea
                value={beforeJson}
                onChange={(e) => setBeforeJson(e.target.value)}
                placeholder="粘贴 ModuleManifest JSON（至少包含 moduleId/digest）"
                className="mt-3 w-full h-40 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs font-mono"
              />
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">after</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAfterMode('module')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  afterMode === 'module'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700'
                }`}
              >
                模块
              </button>
              <button
                type="button"
                onClick={() => setAfterMode('json')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  afterMode === 'json'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700'
                }`}
              >
                JSON
              </button>
            </div>

            {afterMode === 'module' ? (
              <select
                value={afterModuleId}
                onChange={(e) => setAfterModuleId(e.target.value)}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
              >
                {platformVizModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            ) : (
              <textarea
                value={afterJson}
                onChange={(e) => setAfterJson(e.target.value)}
                placeholder="粘贴 ModuleManifest JSON（至少包含 moduleId/digest）"
                className="mt-3 w-full h-40 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs font-mono"
              />
            )}
          </div>
        </div>
      </div>

      {error ? <ErrorBanner title="diffManifest 失败" detail={error} /> : null}

      {diff ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Verdict</div>
              <div
                className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold ${
                  diff.verdict === 'PASS'
                    ? 'bg-emerald-600 text-white'
                    : diff.verdict === 'WARN'
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-600 text-white'
                }`}
              >
                {diff.verdict}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 font-mono break-all">
                moduleId: {diff.moduleId}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">breaking</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{diff.summary.breaking}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">risky</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{diff.summary.risky}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500 dark:text-gray-400">info</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">{diff.summary.info}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                changes（{diff.changes.length}）
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {diff.changes.length === 0 ? (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-300">无差异</div>
              ) : (
                diff.changes.map((c, idx) => (
                  <div key={idx} className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {c.severity} · {c.code}
                      </div>
                      {c.pointer ? (
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{c.pointer}</div>
                      ) : null}
                    </div>
                    {c.message ? <div className="mt-1 text-gray-700 dark:text-gray-200">{c.message}</div> : null}
                    {c.details ? (
                      <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3 overflow-auto">
                        {JSON.stringify(c.details, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <JsonPanel title="Raw JSON（ModuleManifestDiff）" value={diff} />
        </div>
      ) : null}
    </div>
  )
}
