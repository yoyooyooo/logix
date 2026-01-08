import React from 'react'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import { useField, useFieldArray } from '@logixjs/form/react'
import type { FormCaseLink } from './types'
import { GhostButton, JsonCard, PrimaryButton, SectionTitle, ResourceSnapshotSchema } from './shared'

const Option = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
})

type OptionT = Schema.Schema.Type<typeof Option>

const OptionsSnapshot = ResourceSnapshotSchema(Schema.Array(Option))

const Row = Schema.Struct({
  id: Schema.String,
  country: Schema.Literal('CN', 'US'),
  province: Schema.String,
  city: Schema.String,
  warehouseId: Schema.String,
  provinceOptions: OptionsSnapshot,
  cityOptions: OptionsSnapshot,
  warehouseOptions: OptionsSnapshot,
})

type RowT = Schema.Schema.Type<typeof Row>

const Values = Schema.Struct({
  items: Schema.Array(Row),
})

type ValuesT = Schema.Schema.Type<typeof Values>

let nextRowId = 1
const makeRow = (): RowT => ({
  id: `row-${nextRowId++}`,
  country: 'CN',
  province: '',
  city: '',
  warehouseId: '',
  provinceOptions: Logix.Resource.Snapshot.idle(),
  cityOptions: Logix.Resource.Snapshot.idle(),
  warehouseOptions: Logix.Resource.Snapshot.idle(),
})

const $ = Form.from(Values)
const z = $.rules

const ProvinceKey = Schema.Struct({ country: Schema.String })
const CityKey = Schema.Struct({ country: Schema.String, province: Schema.String })
const WarehouseKey = Schema.Struct({ country: Schema.String, province: Schema.String, city: Schema.String })

const provincesByCountry: Record<string, ReadonlyArray<OptionT>> = {
  CN: [
    { id: 'BJ', label: '北京' },
    { id: 'SH', label: '上海' },
    { id: 'GD', label: '广东' },
    { id: 'ZJ', label: '浙江' },
  ],
  US: [
    { id: 'CA', label: 'California' },
    { id: 'NY', label: 'New York' },
    { id: 'TX', label: 'Texas' },
  ],
}

const citiesByProvince: Record<string, ReadonlyArray<OptionT>> = {
  BJ: [
    { id: 'BJ-1', label: '东城' },
    { id: 'BJ-2', label: '西城' },
  ],
  SH: [
    { id: 'SH-1', label: '浦东' },
    { id: 'SH-2', label: '徐汇' },
  ],
  GD: [
    { id: 'GD-1', label: '广州' },
    { id: 'GD-2', label: '深圳' },
  ],
  ZJ: [
    { id: 'ZJ-1', label: '杭州' },
    { id: 'ZJ-2', label: '宁波' },
  ],
  CA: [
    { id: 'CA-1', label: 'San Francisco' },
    { id: 'CA-2', label: 'Los Angeles' },
  ],
  NY: [
    { id: 'NY-1', label: 'New York City' },
    { id: 'NY-2', label: 'Buffalo' },
  ],
  TX: [
    { id: 'TX-1', label: 'Austin' },
    { id: 'TX-2', label: 'Dallas' },
  ],
}

const warehousesByCity: Record<string, ReadonlyArray<OptionT>> = {
  'GD-1': [
    { id: 'WH-GZ-A', label: '广州仓 A' },
    { id: 'WH-GZ-B', label: '广州仓 B' },
  ],
  'GD-2': [
    { id: 'WH-SZ-A', label: '深圳仓 A' },
    { id: 'WH-SZ-B', label: '深圳仓 B' },
  ],
  'ZJ-1': [
    { id: 'WH-HZ-A', label: '杭州仓 A' },
    { id: 'WH-HZ-B', label: '杭州仓 B' },
  ],
  'ZJ-2': [
    { id: 'WH-NB-A', label: '宁波仓 A' },
    { id: 'WH-NB-B', label: '宁波仓 B' },
  ],
  'CA-1': [
    { id: 'WH-SF-A', label: 'SF WH-A' },
    { id: 'WH-SF-B', label: 'SF WH-B' },
  ],
  'CA-2': [
    { id: 'WH-LA-A', label: 'LA WH-A' },
    { id: 'WH-LA-B', label: 'LA WH-B' },
  ],
  'NY-1': [
    { id: 'WH-NYC-A', label: 'NYC WH-A' },
    { id: 'WH-NYC-B', label: 'NYC WH-B' },
  ],
  'NY-2': [
    { id: 'WH-BUF-A', label: 'BUF WH-A' },
    { id: 'WH-BUF-B', label: 'BUF WH-B' },
  ],
  'TX-1': [
    { id: 'WH-AUS-A', label: 'AUS WH-A' },
    { id: 'WH-AUS-B', label: 'AUS WH-B' },
  ],
  'TX-2': [
    { id: 'WH-DAL-A', label: 'DAL WH-A' },
    { id: 'WH-DAL-B', label: 'DAL WH-B' },
  ],
}

const ProvincesSpec = Logix.Resource.make({
  id: 'demo/form/region/provinces',
  keySchema: ProvinceKey,
  load: (key: { readonly country: string }) =>
    Effect.sleep(Duration.millis(240)).pipe(Effect.zipRight(Effect.succeed(provincesByCountry[key.country] ?? []))),
})

const CitiesSpec = Logix.Resource.make({
  id: 'demo/form/region/cities',
  keySchema: CityKey,
  load: (key: { readonly province: string }) =>
    Effect.sleep(Duration.millis(260)).pipe(Effect.zipRight(Effect.succeed(citiesByProvince[key.province] ?? []))),
})

const WarehousesSpec = Logix.Resource.make({
  id: 'demo/form/region/warehouses',
  keySchema: WarehouseKey,
  load: (key: { readonly city: string }) =>
    Effect.sleep(Duration.millis(320)).pipe(Effect.zipRight(Effect.succeed(warehousesByCity[key.city] ?? []))),
})

const DynamicListCascadingForm = Form.make('FormCase.DynamicListCascadingExclusion', {
  values: Values,
  validateOn: ['onSubmit'],
  reValidateOn: ['onChange'],
  initialValues: { items: [makeRow()] } satisfies ValuesT,
  rules: z(
    z.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
      item: {
        deps: ['country', 'province', 'city', 'warehouseId'],
        validateOn: ['onBlur'],
        validate: (row: any) => {
          const errors: Record<string, unknown> = {}
          if (!String(row?.province ?? '')) errors.province = '请选择省/州'
          if (!String(row?.city ?? '')) errors.city = '请选择城市'
          if (!String(row?.warehouseId ?? '')) errors.warehouseId = '请选择仓库'
          return Object.keys(errors).length ? errors : undefined
        },
      },
      list: {
        deps: ['warehouseId'],
        validateOn: ['onChange'],
        validate: (rows) => {
          const items = Array.isArray(rows) ? rows : []
          const indicesByValue = new Map<string, Array<number>>()

          for (let i = 0; i < items.length; i++) {
            const v = String(items[i]?.warehouseId ?? '').trim()
            if (!v) continue
            const bucket = indicesByValue.get(v) ?? []
            bucket.push(i)
            indicesByValue.set(v, bucket)
          }

          const rowErrors: Array<Record<string, unknown> | undefined> = items.map(() => undefined)
          for (const dupIndices of indicesByValue.values()) {
            if (dupIndices.length <= 1) continue
            for (const i of dupIndices) {
              rowErrors[i] = { warehouseId: '仓库选择需跨行互斥（当前重复）' }
            }
          }

          return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
        },
      },
    }),
  ),
  traits: Form.traits(Values)({
    items: Form.list({
      item: Form.node({
        source: {
          provinceOptions: Form.Trait.source({
            resource: ProvincesSpec.id,
            deps: ['country'],
            triggers: ['onMount', 'onKeyChange'],
            concurrency: 'switch',
            key: (country) => ({ country: String(country ?? 'CN') }),
          }),
          cityOptions: Form.Trait.source({
            resource: CitiesSpec.id,
            deps: ['country', 'province'],
            triggers: ['onKeyChange'],
            concurrency: 'switch',
            key: (country, provinceValue) => {
              const province = String(provinceValue ?? '')
              if (!province) return undefined
              return { country: String(country ?? 'CN'), province }
            },
          }),
          warehouseOptions: Form.Trait.source({
            resource: WarehousesSpec.id,
            deps: ['country', 'province', 'city'],
            triggers: ['onKeyChange'],
            concurrency: 'switch',
            key: (country, provinceValue, cityValue) => {
              const city = String(cityValue ?? '')
              if (!city) return undefined
              return { country: String(country ?? 'CN'), province: String(provinceValue ?? ''), city }
            },
          }),
        },
      }),
    }),
  }),
})

const runtime = Logix.Runtime.make(DynamicListCascadingForm.impl, {
  label: 'FormCase.DynamicListCascadingExclusion',
  devtools: true,
  layer: Layer.mergeAll(Logix.Resource.layer([ProvincesSpec, CitiesSpec, WarehousesSpec])),
})

const toOptions = (snap: any): ReadonlyArray<OptionT> =>
  snap?.status === 'success' && Array.isArray(snap?.data) ? (snap.data as ReadonlyArray<OptionT>) : []

const statusText = (snap: any): string => String(snap?.status ?? 'unknown')

const Select: React.FC<{
  readonly label: string
  readonly value: string
  readonly options: ReadonlyArray<OptionT>
  readonly disabled?: boolean
  readonly hint?: string
  readonly error?: unknown
  readonly touched?: boolean
  readonly dirty?: boolean
  readonly onChange: (next: string) => void
  readonly onBlur?: () => void
  readonly disableOption?: (id: string) => boolean
}> = ({ label, value, options, disabled, hint, error, touched, dirty, onChange, onBlur, disableOption }) => (
  <label className="block text-sm text-gray-700 dark:text-gray-200">
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="text-[10px] font-mono text-gray-400">
        touched:{String(!!touched)} dirty:{String(!!dirty)}
      </span>
    </div>
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
    >
      <option value="">（请选择）</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} disabled={disableOption ? disableOption(o.id) : false}>
          {o.label}
        </option>
      ))}
    </select>
    {hint ? <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">{hint}</div> : null}
    {touched && error ? <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{String(error)}</div> : null}
  </label>
)

const RowCard: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly row: any
  readonly usedWarehouseIds: ReadonlySet<string>
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, row, usedWarehouseIds, canRemove, onRemove }) => {
  const base = `items.${index}`

  const country = useField(form, `${base}.country`)
  const province = useField(form, `${base}.province`)
  const city = useField(form, `${base}.city`)
  const warehouseId = useField(form, `${base}.warehouseId`)

  const provinceOptions = toOptions(row?.provinceOptions)
  const cityOptions = toOptions(row?.cityOptions)
  const warehouseOptions = toOptions(row?.warehouseOptions)

  const set = (path: string, value: unknown) => form.dispatch({ _tag: 'setValue', payload: { path, value } })

  const resetAfterCountry = (nextCountry: string) => {
    country.onChange(nextCountry as any)
    set(`${base}.province`, '')
    set(`${base}.city`, '')
    set(`${base}.warehouseId`, '')
  }

  const resetAfterProvince = (nextProvince: string) => {
    province.onChange(nextProvince as any)
    set(`${base}.city`, '')
    set(`${base}.warehouseId`, '')
  }

  const resetAfterCity = (nextCity: string) => {
    city.onChange(nextCity as any)
    set(`${base}.warehouseId`, '')
  }

  const isWarehouseTakenByOthers = (id: string) => id !== String(warehouseId.value ?? '') && usedWarehouseIds.has(id)

  return (
    <div
      key={fieldsId}
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
          #{index + 1} · {String(row?.id ?? '')}
        </div>
        <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
          删除
        </GhostButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="国家"
          value={String(country.value ?? 'CN')}
          options={[
            { id: 'CN', label: 'CN' },
            { id: 'US', label: 'US' },
          ]}
          hint={`provinceOptions: ${statusText(row?.provinceOptions)}`}
          error={country.error}
          touched={country.touched}
          dirty={country.dirty}
          onChange={resetAfterCountry}
          onBlur={country.onBlur}
        />

        <Select
          label="省/州"
          value={String(province.value ?? '')}
          options={provinceOptions}
          disabled={provinceOptions.length === 0}
          hint={`cityOptions: ${statusText(row?.cityOptions)}`}
          error={province.error}
          touched={province.touched}
          dirty={province.dirty}
          onChange={resetAfterProvince}
          onBlur={province.onBlur}
        />

        <Select
          label="城市"
          value={String(city.value ?? '')}
          options={cityOptions}
          disabled={cityOptions.length === 0}
          hint={`warehouseOptions: ${statusText(row?.warehouseOptions)}`}
          error={city.error}
          touched={city.touched}
          dirty={city.dirty}
          onChange={resetAfterCity}
          onBlur={city.onBlur}
        />

        <Select
          label="仓库（跨行互斥）"
          value={String(warehouseId.value ?? '')}
          options={warehouseOptions}
          disabled={warehouseOptions.length === 0}
          hint="同一个仓库只能被一行选择（已选择的仓库将对其它行禁用）"
          error={warehouseId.error}
          touched={warehouseId.touched}
          dirty={warehouseId.dirty}
          onChange={(next) => warehouseId.onChange(next)}
          onBlur={warehouseId.onBlur}
          disableOption={isWarehouseTakenByOthers}
        />
      </div>
    </div>
  )
}

const DynamicListCascadingCase: React.FC = () => {
  const form = useModule(DynamicListCascadingForm)
  const dispatch = form.dispatch
  const state = useSelector(form)

  const items = state.items ?? []
  const { fields, append, remove } = useFieldArray(form, 'items')

  const usedWarehouseIds = React.useMemo(() => {
    const set = new Set<string>()
    for (const it of items) {
      const id = String(it?.warehouseId ?? '').trim()
      if (id) set.add(id)
    }
    return set
  }, [items])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 11 · 动态列表 + 级联异步查询 + 跨行互斥"
        desc="items[] 用 useFieldArray 动态增删；每行 province/city/warehouse options 由 source 异步拉取（keyHash gate）；跨行互斥由 list-scope 校验一次扫描写回 errors.items.rows[i].warehouseId。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-2">
            <GhostButton type="button" onClick={() => append(makeRow())}>
              新增一行
            </GhostButton>
            <PrimaryButton type="button" onClick={() => dispatch({ _tag: 'submit' })}>
              提交校验（root validate）
            </PrimaryButton>
          </div>

          <div className="space-y-4">
            {items.map((row, index) => (
              <RowCard
                key={fields[index]?.id ?? String(index)}
                form={form as any}
                fieldsId={fields[index]?.id ?? String(index)}
                index={index}
                row={row}
                usedWarehouseIds={usedWarehouseIds}
                canRemove={items.length > 1}
                onRemove={remove}
              />
            ))}
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

const DynamicListCascadingPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <DynamicListCascadingCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case11DynamicListCascadingExclusion: FormCaseLink = {
  id: '11',
  title: '动态列表级联互斥',
  to: 'dynamic-list-cascading-exclusion',
  desc: 'useFieldArray + per-row source + cross-row unique',
  element: <DynamicListCascadingPage />,
}
