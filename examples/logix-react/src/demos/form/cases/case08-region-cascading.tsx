import React from 'react'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import * as Query from '@logixjs/query'
import { QueryClient } from '@tanstack/query-core'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, PrimaryButton, GhostButton } from './shared'

const RegionValues = Schema.Struct({
  country: Schema.Literal('CN', 'US'),
  province: Schema.String,
  city: Schema.String,
})

type RegionV = Schema.Schema.Type<typeof RegionValues>

const regionInitialValues: RegionV = {
  country: 'CN',
  province: '',
  city: '',
}

const $ = Form.from(RegionValues)
const z = $.rules

const CascadingForm = Form.make('FormCase.RegionCascading', {
  values: RegionValues,
  validateOn: ['onBlur'],
  reValidateOn: ['onBlur'],
  initialValues: regionInitialValues,
  rules: z(z.field('province', { required: '请选择省/州' }), z.field('city', { required: '请选择城市' })),
})

const ProvincesKey = Schema.Struct({ country: Schema.String })
const CitiesKey = Schema.Struct({ country: Schema.String, province: Schema.String })

const ProvinceSpec = Logix.Resource.make({
  id: 'demo/region/provinces',
  keySchema: ProvincesKey,
  load: (key: { readonly country: string }) =>
    Effect.sleep(Duration.millis(300)).pipe(
      Effect.zipRight(
        Effect.succeed(key.country === 'CN' ? ['北京', '上海', '浙江', '广东'] : ['California', 'New York', 'Texas']),
      ),
    ),
})

const CitySpec = Logix.Resource.make({
  id: 'demo/region/cities',
  keySchema: CitiesKey,
  load: (key: { readonly country: string; readonly province: string }) =>
    Effect.sleep(Duration.millis(350)).pipe(
      Effect.zipRight(
        Effect.succeed(
          key.country === 'CN'
            ? key.province === '浙江'
              ? ['杭州', '宁波', '温州']
              : key.province === '广东'
                ? ['广州', '深圳', '佛山']
                : key.province
                  ? ['（示例城市 A）', '（示例城市 B）']
                  : []
            : key.province
              ? ['(Sample City 1)', '(Sample City 2)']
              : [],
        ),
      ),
    ),
})

const RegionParams = Schema.Struct({
  country: Schema.String,
  province: Schema.String,
})

type RegionP = Schema.Schema.Type<typeof RegionParams>

type RegionUi = {
  readonly query: {
    readonly autoEnabled: boolean
  }
}

const regionInitialUi: RegionUi = {
  query: { autoEnabled: true },
}

const RegionQuery = Query.make('RegionQuery', {
  params: RegionParams,
  initialParams: { country: 'CN', province: '' },
  ui: regionInitialUi,
  queries: ($) => ({
    provinces: $.source({
      resource: ProvinceSpec,
      deps: ['params.country', 'ui.query.autoEnabled'],
      triggers: ['onMount', 'onKeyChange'],
      concurrency: 'switch',
      key: (country, autoEnabled) => (autoEnabled ? { country } : undefined),
    }),
    cities: $.source({
      resource: CitySpec,
      deps: ['params.country', 'params.province', 'ui.query.autoEnabled'],
      triggers: ['onKeyChange'],
      concurrency: 'switch',
      key: (country, province, autoEnabled) => {
        if (!autoEnabled) return undefined
        if (!province) return undefined
        return { country, province }
      },
    }),
  }),
})

const RegionHostDef = Logix.Module.make('RegionHost', {
  state: Schema.Void,
  actions: { noop: Schema.Void },
})

const RegionHostModule = RegionHostDef.implement({
  initial: undefined,
  imports: [CascadingForm.impl, RegionQuery.impl],
})

const regionLayer = Layer.mergeAll(
  Logix.Resource.layer([ProvinceSpec, CitySpec]),
  Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
)

const runtime = Logix.Runtime.make(RegionHostModule, {
  label: 'FormCase.RegionCascading',
  devtools: true,
  layer: regionLayer,
  middleware: [Query.Engine.middleware()],
})

const RegionCascadingCase: React.FC = () => {
  const form = useModule(CascadingForm.tag)
  const formState = useSelector(form)

  const queryRuntime = useModule(RegionQuery.tag)
  const queryState = useSelector(queryRuntime)

  const provincesSnap = queryState?.queries?.provinces
  const citiesSnap = queryState?.queries?.cities

  const provinces: ReadonlyArray<string> = provincesSnap?.status === 'success' ? (provincesSnap.data ?? []) : []
  const cities: ReadonlyArray<string> = citiesSnap?.status === 'success' ? (citiesSnap.data ?? []) : []

  const setCountry = (country: string) => {
    form.actions.setValue({ path: 'country', value: country })
    form.actions.setValue({ path: 'province', value: '' })
    form.actions.setValue({ path: 'city', value: '' })
    queryRuntime.actions.dispatch({ _tag: 'setParams', payload: { ...queryState.params, country, province: '' } })
  }

  const setProvince = (province: string) => {
    form.actions.setValue({ path: 'province', value: province })
    form.actions.setValue({ path: 'city', value: '' })
    queryRuntime.actions.dispatch({ _tag: 'setParams', payload: { ...queryState.params, province } })
  }

  const setCity = (city: string) => {
    form.actions.setValue({ path: 'city', value: city })
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 08 · 级联选择（form + query）"
        desc="同一 Runtime 内组合 Form.impl + Query.impl：Query 负责 options 的触发/竞态/缓存，Form 只承载 values/errors/ui。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <label className="block text-sm text-gray-700 dark:text-gray-200">
              Country
              <select
                value={String(formState?.country ?? 'CN')}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="CN">CN</option>
                <option value="US">US</option>
              </select>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Province
                <select
                  value={String(formState?.province ?? '')}
                  onChange={(e) => setProvince(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">（请选择）</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  provinces: {String(provincesSnap?.status ?? 'idle')}
                </div>
              </label>

              <label className="block text-sm text-gray-700 dark:text-gray-200">
                City
                <select
                  value={String(formState?.city ?? '')}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">（请选择）</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  cities: {String(citiesSnap?.status ?? 'idle')}
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                提交
              </PrimaryButton>
              <GhostButton
                type="button"
                onClick={() =>
                  queryRuntime.actions.dispatch({
                    _tag: 'setUi',
                    payload: { query: { autoEnabled: !queryState.ui.query.autoEnabled } },
                  })
                }
              >
                切换 autoEnabled
              </GhostButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <JsonCard title="form.values" value={formState} />
          <JsonCard title="query" value={queryState} />
        </div>
      </div>
    </div>
  )
}

const RegionCascadingPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <RegionCascadingCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case08RegionCascading: FormCaseLink = {
  id: '08',
  title: '级联选择',
  to: 'region-cascading',
  desc: 'form + query 同 runtime',
  element: <RegionCascadingPage />,
}
