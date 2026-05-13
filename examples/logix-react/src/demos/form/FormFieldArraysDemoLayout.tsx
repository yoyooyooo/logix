// Example role: Form row lifecycle
// Covers: SC-E
// Capability refs: CAP-17, CAP-19, CAP-20, CAP-21, CAP-22, CAP-23, CAP-25
// Proof refs: PF-05, PF-06, PF-08
// SSoT: docs/ssot/form/06-capability-scenario-api-support-map.md

import React from 'react'
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'
import type * as Form from '@logixjs/form'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '@logixjs/react'
import { RulesCompositionMixedForm, type RulesCompositionMixedValues } from '../../modules/rules-composition-mixed-form'
import type { ModuleRefOfTag } from '../../../../../packages/logix-react/src/internal/store/ModuleRef'

type Item = {
  readonly id: string
  readonly sku: string
  readonly quantity: number
  readonly price: number
  readonly discount: number
}

type RulesCompositionMixedFormRef = ModuleRefOfTag<
  'FormRulesComposition.Mixed',
  typeof RulesCompositionMixedForm.shape
> &
  Form.FormHandle<RulesCompositionMixedValues>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readPath = (value: unknown, path: ReadonlyArray<string>): unknown => {
  let current: unknown = value
  for (const segment of path) {
    if (Array.isArray(current) && /^[0-9]+$/.test(segment)) {
      current = current[Number(segment)]
      continue
    }
    if (!isRecord(current)) return undefined
    current = current[segment]
  }
  return current
}

const readItemRowErrors = (errors: unknown): ReadonlyArray<unknown | undefined> => {
  const rows = readPath(errors, ['items', 'rows'])
  return Array.isArray(rows) ? rows : []
}

const readItemListError = (errors: unknown): unknown => readPath(errors, ['items', '$list'])

const readCleanupReceipt = (ui: unknown): unknown => readPath(ui, ['$cleanup', 'items'])

let nextSampleId = 1

const makeSampleItem = (): Item => {
  const index = nextSampleId++
  return {
    id: `line-${String(index).padStart(2, '0')}`,
    sku: `SKU-${String(index).padStart(2, '0')}`,
    quantity: 1,
    price: 10 * index,
    discount: 0,
  }
}

const runtime = Logix.Runtime.make(RulesCompositionMixedForm, {
  label: 'FormFieldArraysDemoRuntime',
  devtools: true,
})

let routeMountCount = 0

const FormFieldArraysPanel: React.FC = () => {
  const routeMountedAtRef = React.useRef(performance.now())
  const routeMountIndexRef = React.useRef(++routeMountCount)
  const [restoreCostMs, setRestoreCostMs] = React.useState<number | null>(null)
  const form = useModule(RulesCompositionMixedForm.tag) as unknown as RulesCompositionMixedFormRef
  const items = useSelector(form, fieldValue('items'))
  const errors = useSelector(form, fieldValue('errors'))
  const ui = useSelector(form, fieldValue('ui'))
  const submitAttempt = useSelector(form, fieldValue('$form.submitAttempt'))
  const rowErrors = React.useMemo(() => readItemRowErrors(errors), [errors])
  const listError = React.useMemo(() => readItemListError(errors), [errors])
  const cleanupReceipt = React.useMemo(() => readCleanupReceipt(ui), [ui])

  React.useEffect(() => {
    setRestoreCostMs(Math.round((performance.now() - routeMountedAtRef.current) * 100) / 100)
  }, [])

  const append = () => {
    void Effect.runPromise(form.fieldArray('items').append(makeSampleItem()))
  }

  const replaceRoster = () => {
    void Effect.runPromise(form.fieldArray('items').replace([makeSampleItem(), makeSampleItem(), makeSampleItem()]))
  }

  const swapFirstTwo = () => {
    if (items.length < 2) return
    void Effect.runPromise(form.fieldArray('items').swap(0, 1))
  }

  const moveLastToFirst = () => {
    if (items.length < 2) return
    void Effect.runPromise(form.fieldArray('items').move(items.length - 1, 0))
  }

  const submit = () => {
    void runtime.runPromiseExit(form.submit())
  }

  const setField = (index: number, field: 'sku' | 'quantity' | 'price') => (value: string) => {
    const path = `items.${index}.${field}`
    const next =
      field === 'sku' ? value : field === 'quantity' ? Math.max(0, Number(value) || 0) : Math.max(0, Number(value) || 0)
    void Effect.runPromise(form.field(path).set(next))
  }

  const removeByRowId = (rowId: string) => {
    void Effect.runPromise(form.fieldArray('items').byRowId(rowId).remove())
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Form · Field Arrays</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
              这页把 canonical form handle 的列表能力集中到一处：
              <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-800">
                fieldArray(...)
              </code>
              、
              <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-800">
                byRowId(...)
              </code>
              、cleanup receipt 与 submitAttempt 会沿同一条 evidence 线出现。
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-mono text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            Canonical · Row Heavy
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="field-arrays-append"
              onClick={append}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white transition-colors hover:bg-violet-700"
            >
              Append sample
            </button>
            <button
              type="button"
              onClick={replaceRoster}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Replace roster
            </button>
            <button
              type="button"
              onClick={swapFirstTwo}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Swap first two
            </button>
            <button
              type="button"
              onClick={moveLastToFirst}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Move last to first
            </button>
            <button
              type="button"
              onClick={submit}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              Submit evidence
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const rowId = String(item.id)
              const rowError = rowErrors[index]
              return (
                <div
                  key={rowId}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{rowId}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        byRowId remove/update 都以这条 identity 为准
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeByRowId(rowId)}
                      className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      Remove byRowId
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-gray-600 dark:text-gray-300">
                      SKU
                      <input
                        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        value={item.sku}
                        onChange={(e) => setField(index, 'sku')(e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-300">
                      Quantity
                      <input
                        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => setField(index, 'quantity')(e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-300">
                      Price
                      <input
                        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={(e) => setField(index, 'price')(e.target.value)}
                      />
                    </label>
                  </div>

                  {rowError ? (
                    <pre className="mt-3 overflow-x-auto rounded-md bg-rose-50 p-3 text-[11px] text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                      {JSON.stringify(rowError, null, 2)}
                    </pre>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Row cleanup summary</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              这里直接展示 row-heavy coverage 关心的两件事：cleanup receipt 和 submitAttempt。
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                instance scope
              </div>
              <dl className="grid gap-2 text-xs text-gray-800 dark:text-gray-200">
                <div className="flex justify-between gap-3">
                  <dt>mode</dt>
                  <dd data-testid="field-arrays-scope" className="font-mono">
                    global
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>instanceId</dt>
                  <dd data-testid="field-arrays-instance-id" className="max-w-44 truncate font-mono" title={form.runtime.instanceId}>
                    {form.runtime.instanceId}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>route mounts</dt>
                  <dd data-testid="field-arrays-route-mount-count" className="font-mono">
                    {routeMountIndexRef.current}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>rows</dt>
                  <dd data-testid="field-arrays-row-count" className="font-mono">
                    {items.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>restore cost</dt>
                  <dd data-testid="field-arrays-restore-cost" className="font-mono">
                    {restoreCostMs === null ? 'measuring' : `${restoreCostMs}ms`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">list error</div>
              <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                {listError ? JSON.stringify(listError) : 'undefined'}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                cleanup receipt
              </div>
              <pre className="overflow-x-auto text-[11px] text-gray-800 dark:text-gray-200">
                {JSON.stringify(cleanupReceipt ?? null, null, 2)}
              </pre>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                submit attempt
              </div>
              <pre className="overflow-x-auto text-[11px] text-gray-800 dark:text-gray-200">
                {JSON.stringify(submitAttempt ?? null, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const FormFieldArraysDemoLayout: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <FormFieldArraysPanel />
  </RuntimeProvider>
)
