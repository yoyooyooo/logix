import React from 'react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import { useField, useFieldArray } from '@logixjs/form/react'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, TextField, NumberField, PrimaryButton, GhostButton } from './shared'

const LineItem = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  quantity: Schema.Number,
  price: Schema.Number,
})

const LineItemsValues = Schema.Struct({
  items: Schema.Array(LineItem),
  summary: Schema.Struct({
    itemCount: Schema.Number,
    totalQty: Schema.Number,
    totalAmount: Schema.Number,
  }),
})

type LineItemsV = Schema.Schema.Type<typeof LineItemsValues>

let nextLineId = 1
const makeLine = () => ({ id: `line-${nextLineId++}`, name: '', quantity: 1, price: 0 })

const $ = Form.from(LineItemsValues)
const z = $.rules

const LineItemsForm = Form.make('FormCase.LineItems', {
  values: LineItemsValues,
  validateOn: ['onChange', 'onBlur'],
  reValidateOn: ['onChange', 'onBlur'],
  initialValues: {
    items: [makeLine()],
    summary: { itemCount: 1, totalQty: 1, totalAmount: 0 },
  },
  derived: $.derived({
    'summary.itemCount': Form.computed({
      deps: ['items'],
      get: (items) => items.length,
    }),
    'summary.totalQty': Form.computed({
      deps: ['items'],
      get: (items) => items.reduce((acc: number, it: any) => acc + it.quantity, 0),
    }),
    'summary.totalAmount': Form.computed({
      deps: ['items'],
      get: (items) => items.reduce((acc: number, it: any) => acc + it.quantity * it.price, 0),
    }),
  }),
  rules: z(
    z.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
      item: {
        deps: ['name', 'quantity', 'price'],
        validate: (row) => {
          if (!row || typeof row !== 'object') return { $item: '行数据异常' }
          const errors: Record<string, unknown> = {}
          if (!String(row.name ?? '').trim()) errors.name = '名称必填'
          if (!(typeof row.quantity === 'number') || row.quantity <= 0) errors.quantity = '数量需 > 0'
          if (!(typeof row.price === 'number') || row.price < 0) errors.price = '价格需 ≥ 0'
          return Object.keys(errors).length ? errors : undefined
        },
      },
    }),
  ),
})

const runtime = Logix.Runtime.make(LineItemsForm, {
  label: 'FormCase.LineItems',
  devtools: true,
})

const LineItemRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly row: any
  readonly canRemove: boolean
  readonly canMoveUp: boolean
  readonly canMoveDown: boolean
  readonly onRemove: (index: number) => void
  readonly onSwapUp: (index: number) => void
  readonly onMoveDown: (index: number) => void
}> = ({ form, fieldsId, index, row, canRemove, canMoveUp, canMoveDown, onRemove, onSwapUp, onMoveDown }) => {
  const base = `items.${index}`
  const name = useField(form, `${base}.name`)
  const quantity = useField(form, `${base}.quantity`)
  const price = useField(form, `${base}.price`)

  return (
    <div
      key={fieldsId}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          #{index + 1} · {String(row?.id ?? '')}
        </div>
        <div className="flex gap-2">
          <GhostButton type="button" onClick={() => onSwapUp(index)} disabled={!canMoveUp}>
            上移
          </GhostButton>
          <GhostButton type="button" onClick={() => onMoveDown(index)} disabled={!canMoveDown}>
            下移
          </GhostButton>
          <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
            删除
          </GhostButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TextField
          label="名称"
          value={name.value}
          error={name.error}
          touched={name.touched}
          dirty={name.dirty}
          onChange={(next) => name.onChange(next)}
          onBlur={name.onBlur}
        />
        <NumberField
          label="数量"
          value={quantity.value}
          error={quantity.error}
          touched={quantity.touched}
          dirty={quantity.dirty}
          onChange={(next) => quantity.onChange(next)}
          onBlur={quantity.onBlur}
        />
        <NumberField
          label="价格"
          value={price.value}
          error={price.error}
          touched={price.touched}
          dirty={price.dirty}
          onChange={(next) => price.onChange(next)}
          onBlur={price.onBlur}
        />
      </div>
    </div>
  )
}

const LineItemsCase: React.FC = () => {
  const form = useModule(LineItemsForm)
  const state = useSelector(form)
  const items = Array.isArray(state?.items) ? state.items : []

  const { fields, append, prepend, remove, swap, move } = useFieldArray(form, 'items')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 02 · 订单行表格"
        desc="动态数组（Form.array*）+ trackBy(id) + items[] check + 汇总 computed。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Items</div>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => prepend(makeLine())}>
                  头插
                </GhostButton>
                <GhostButton type="button" onClick={() => append(makeLine())}>
                  追加
                </GhostButton>
                <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                  提交校验
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((row, index) => (
                <LineItemRow
                  key={fields[index]?.id ?? String(index)}
                  form={form as any}
                  fieldsId={fields[index]?.id ?? String(index)}
                  index={index}
                  row={row}
                  canRemove={items.length > 1}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                  onRemove={remove}
                  onSwapUp={(i) => swap(i, Math.max(0, i - 1))}
                  onMoveDown={(i) => move(i, Math.min(items.length - 1, i + 1))}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                itemCount:{' '}
                <span className="text-blue-600 dark:text-blue-300">{String(state?.summary?.itemCount ?? 0)}</span>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                totalQty:{' '}
                <span className="text-blue-600 dark:text-blue-300">{String(state?.summary?.totalQty ?? 0)}</span>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                totalAmount:{' '}
                <span className="text-blue-600 dark:text-blue-300">
                  {Number(state?.summary?.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <JsonCard title="values" value={state} />
          <JsonCard title="errors" value={state?.errors} />
          <JsonCard title="ui" value={state?.ui} />
        </div>
      </div>
    </div>
  )
}

const LineItemsPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <LineItemsCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case02LineItems: FormCaseLink = {
  id: '02',
  title: '订单行表格',
  to: 'line-items',
  desc: '动态数组 + trackBy + items[] check',
  element: <LineItemsPage />,
}
