import React from 'react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import { useField, useFieldArray } from '@logixjs/form/react'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, TextField, NumberField, PrimaryButton, GhostButton } from './shared'

const Allocation = Schema.Struct({
  id: Schema.String,
  dept: Schema.String,
  amount: Schema.Number,
})

const CostItem = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  allocations: Schema.Array(Allocation),
})

const NestedValues = Schema.Struct({
  items: Schema.Array(CostItem),
})

let nextCostId = 1
let nextAllocId = 1
const makeAllocation = () => ({ id: `a-${nextAllocId++}`, dept: '', amount: 0 })
const makeCostItem = () => ({ id: `i-${nextCostId++}`, title: '', allocations: [makeAllocation()] })

const $ = Form.from(NestedValues)
const z = $.rules

const NestedForm = Form.make('FormCase.NestedAllocations', {
  values: NestedValues,
  validateOn: ['onBlur'],
  reValidateOn: ['onBlur'],
  initialValues: { items: [makeCostItem()] },
  rules: z(
    z.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
    }),
    z.list('items.allocations', {
      identity: { mode: 'trackBy', trackBy: 'id' },
      list: {
        validate: (rows) => ({
          $list: Array.isArray(rows) && rows.length > 0 ? undefined : '至少一个分摊',
        }),
      },
    }),
    z.field('items.title', { required: '请填写标题' }),
    z.field('items.allocations.dept', { required: '请填写部门' }),
    z.field('items.allocations.amount', {
      min: { min: 0.01, message: '金额必须 > 0' },
    }),
  ),
})

const runtime = Logix.Runtime.make(NestedForm, {
  label: 'FormCase.NestedAllocations',
  devtools: true,
})

const AllocationRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly path: string
  readonly index: number
  readonly row: any
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, path, index, row, canRemove, onRemove }) => {
  const allocBase = `${path}.${index}`
  const dept = useField(form, `${allocBase}.dept`)
  const amount = useField(form, `${allocBase}.amount`)

  return (
    <div
      key={fieldsId}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
          #{index + 1} · {String(row?.id ?? '')}
        </div>
        <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
          删除
        </GhostButton>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          label="部门"
          value={dept.value}
          error={dept.error}
          touched={dept.touched}
          dirty={dept.dirty}
          onChange={(next) => dept.onChange(next)}
          onBlur={dept.onBlur}
        />
        <NumberField
          label="金额"
          value={amount.value}
          error={amount.error}
          touched={amount.touched}
          dirty={amount.dirty}
          onChange={(next) => amount.onChange(next)}
          onBlur={amount.onBlur}
        />
      </div>
    </div>
  )
}

const CostItemCard: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly item: any
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, item, canRemove, onRemove }) => {
  const base = `items.${index}`
  const title = useField(form, `${base}.title`)
  const allocationsPath = `${base}.allocations`
  const allocations: ReadonlyArray<any> = Array.isArray(item?.allocations) ? item.allocations : []
  const allocArray = useFieldArray(form, allocationsPath)

  return (
    <div
      key={fieldsId}
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          Item #{index + 1} · {String(item?.id ?? '')}
        </div>
        <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
          删除 Item
        </GhostButton>
      </div>

      <TextField
        label="标题"
        value={title.value}
        error={title.error}
        touched={title.touched}
        dirty={title.dirty}
        onChange={(next) => title.onChange(next)}
        onBlur={title.onBlur}
      />

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Allocations</div>
          <GhostButton type="button" onClick={() => allocArray.append(makeAllocation())}>
            新增 Allocation
          </GhostButton>
        </div>

        <div className="space-y-2">
          {allocations.map((a, allocIndex) => (
            <AllocationRow
              key={allocArray.fields[allocIndex]?.id ?? String(allocIndex)}
              form={form}
              fieldsId={allocArray.fields[allocIndex]?.id ?? String(allocIndex)}
              path={allocationsPath}
              index={allocIndex}
              row={a}
              canRemove={allocations.length > 1}
              onRemove={allocArray.remove}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const NestedAllocationsCase: React.FC = () => {
  const form = useModule(NestedForm)
  const state = useSelector(form) as any
  const items: ReadonlyArray<any> = Array.isArray(state?.items) ? state.items : []

  const itemsArray = useFieldArray(form, 'items')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 04 · 两层嵌套数组（分摊）"
        desc="items[] → allocations[] 的增删改；使用 rules-first 显式声明两层 list identity，并验证深层写回（errors.items.rows[i].allocations.rows[j].*）。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Cost Items</div>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => itemsArray.append(makeCostItem())}>
                  新增 Item
                </GhostButton>
                <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                  提交校验
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, itemIndex) => (
                <CostItemCard
                  key={itemsArray.fields[itemIndex]?.id ?? String(itemIndex)}
                  form={form as any}
                  fieldsId={itemsArray.fields[itemIndex]?.id ?? String(itemIndex)}
                  index={itemIndex}
                  item={item}
                  canRemove={items.length > 1}
                  onRemove={itemsArray.remove}
                />
              ))}
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

const NestedAllocationsPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <NestedAllocationsCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case04NestedAllocations: FormCaseLink = {
  id: '04',
  title: '嵌套数组',
  to: 'nested-allocations',
  desc: '两层数组增删改（rules-first）',
  element: <NestedAllocationsPage />,
}
