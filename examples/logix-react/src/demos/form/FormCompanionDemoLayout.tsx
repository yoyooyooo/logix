// Example role: Local soft fact coordination
// Covers: SC-C, SC-D
// Capability refs: CAP-10, CAP-11, CAP-12, CAP-13, CAP-14, CAP-15, CAP-16, CAP-17, CAP-18
// Proof refs: PF-03, PF-04, PF-08
// SSoT: docs/ssot/form/06-capability-scenario-api-support-map.md

import React from 'react'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '@logixjs/react'

const Warehouses = ['WH-001', 'WH-002', 'WH-003', 'WH-004'] as const

const RowSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
})

const ValuesSchema = Schema.Struct({
  countryId: Schema.String,
  items: Schema.Array(RowSchema),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>

const CompanionForm = Form.make(
  'FormCompanionDemo',
  {
    values: ValuesSchema,
    initialValues: {
      countryId: 'CN',
      items: [
        { id: 'row-a', warehouseId: 'WH-001' },
        { id: 'row-b', warehouseId: 'WH-002' },
        { id: 'row-c', warehouseId: '' },
      ],
    } satisfies Values,
  },
  (form) => {
    form.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
    })

    form.field('items.warehouseId').companion({
      deps: ['countryId', 'items.warehouseId'],
      lower: (ctx) => {
        const taken = new Set(
          Array.isArray(ctx.deps['items.warehouseId'])
            ? ctx.deps['items.warehouseId'].filter(
                (value): value is string => typeof value === 'string' && value.length > 0,
              )
            : [],
        )

        return {
          availability: {
            kind: ctx.deps.countryId ? 'interactive' : 'hidden',
            countryId: ctx.deps.countryId,
          },
          candidates: {
            items: Warehouses.filter((candidate) => candidate === ctx.value || !taken.has(candidate)),
            keepCurrent: true,
          },
        }
      },
    })
  },
)

const runtime = Logix.Runtime.make(CompanionForm, {
  label: 'FormCompanionDemoRuntime',
  devtools: true,
})

const FormCompanionPanel: React.FC = () => {
  const form = useModule(CompanionForm)
  const countryId = useSelector(form, fieldValue('countryId'))
  const items = useSelector(form, fieldValue('items'))

  const setCountry = (next: string) => {
    void Effect.runPromise(form.field('countryId').set(next))
  }

  const setWarehouse = (index: number, next: string) => {
    void Effect.runPromise(form.field(`items.${index}.warehouseId`).set(next))
  }

  const swapFirstTwo = () => {
    if (items.length < 2) return
    void Effect.runPromise(form.fieldArray('items').swap(0, 1))
  }

  const replaceRoster = () => {
    void Effect.runPromise(
      form.fieldArray('items').replace([
        { id: 'row-x', warehouseId: 'WH-004' },
        { id: 'row-y', warehouseId: '' },
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Form · Field Companion</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              这页展示
              <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-800">
                field(path).companion({'{ deps, lower }'})
              </code>
              ：字段侧同步降出 availability / candidates，最终一致性仍交给 rule / submit。当前 exact read carrier 仍 deferred，
              本页不读取内部 landing path。
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-mono text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            SC-C / SC-D / WF1 / WF5
          </span>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block text-xs text-gray-600 dark:text-gray-300">
            countryId
            <select
              className="mt-1 w-48 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={countryId}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="CN">CN</option>
              <option value="US">US</option>
              <option value="">hidden</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={swapFirstTwo}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Swap first two
            </button>
            <button
              type="button"
              onClick={replaceRoster}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Replace roster
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((row, index) => {
          return (
            <section
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{row.id}</h3>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">field-only companion bundle</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  read carrier deferred
                </span>
              </div>

              <label className="block text-xs text-gray-600 dark:text-gray-300">
                warehouseId
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  value={row.warehouseId}
                  onChange={(event) => setWarehouse(index, event.target.value)}
                >
                  <option value="">未选择</option>
                  {Warehouses.map((id: string) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] text-gray-900 dark:bg-gray-950/60 dark:text-gray-100">
                {JSON.stringify(
                  {
                    companionAuthoring: 'field(path).companion({ deps, lower })',
                    fieldOnlyOwner: row.id,
                    readCarrier: 'deferred',
                    internalPath: 'not public',
                    selected: row.warehouseId || null,
                  },
                  null,
                  2,
                )}
              </pre>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export const FormCompanionDemoLayout: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <FormCompanionPanel />
  </RuntimeProvider>
)
