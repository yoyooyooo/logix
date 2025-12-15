import React from "react"
import { Duration, Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useForm } from "@logix/form/react"
import { Query } from "@logix/query"
import { QueryClient } from "@tanstack/query-core"
import type { FormCaseLink } from "./types"
import { JsonCard, SectionTitle, PrimaryButton, GhostButton } from "./shared"

const RegionValues = Schema.Struct({
  country: Schema.Literal("CN", "US"),
  province: Schema.String,
  city: Schema.String,
})

type RegionV = Schema.Schema.Type<typeof RegionValues>

const regionInitialValues: RegionV = {
  country: "CN",
  province: "",
  city: "",
}

const CascadingForm = Form.make("FormCase.RegionCascading", {
  values: RegionValues,
  mode: "onBlur",
  initialValues: regionInitialValues,
})

const ProvincesKey = Schema.Struct({ country: Schema.String })
const CitiesKey = Schema.Struct({ country: Schema.String, province: Schema.String })

const ProvinceSpec = Logix.Resource.make({
  id: "demo/region/provinces",
  keySchema: ProvincesKey,
  load: (key: { readonly country: string }) =>
    Effect.sleep(Duration.millis(300)).pipe(
      Effect.zipRight(
        Effect.succeed(
          key.country === "CN" ? ["北京", "上海", "浙江", "广东"] : ["California", "New York", "Texas"],
        ),
      ),
    ),
})

const CitySpec = Logix.Resource.make({
  id: "demo/region/cities",
  keySchema: CitiesKey,
  load: (key: { readonly country: string; readonly province: string }) =>
    Effect.sleep(Duration.millis(350)).pipe(
      Effect.zipRight(
        Effect.succeed(
          key.country === "CN"
            ? key.province === "浙江"
              ? ["杭州", "宁波", "温州"]
              : key.province === "广东"
                ? ["广州", "深圳", "佛山"]
                : key.province
                  ? ["（示例城市 A）", "（示例城市 B）"]
                  : []
            : key.province
              ? ["(Sample City 1)", "(Sample City 2)"]
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

const RegionQuery = Query.make("RegionQuery", {
  params: RegionParams,
  initialParams: { country: "CN", province: "" },
  ui: { query: { autoEnabled: true } },
  queries: {
    provinces: {
      resource: ProvinceSpec,
      deps: ["params.country", "ui.query.autoEnabled"],
      triggers: ["onMount", "onValueChange"],
      concurrency: "switch",
      key: (params: RegionP, ui: any) => (ui?.query?.autoEnabled ? { country: params.country } : undefined),
    },
    cities: {
      resource: CitySpec,
      deps: ["params.country", "params.province", "ui.query.autoEnabled"],
      triggers: ["onValueChange"],
      concurrency: "switch",
      key: (params: RegionP, ui: any) => {
        if (!ui?.query?.autoEnabled) return undefined
        if (!params.province) return undefined
        return { country: params.country, province: params.province }
      },
    },
  },
})

const RegionHost = Logix.Module.make("RegionHost", {
  state: Schema.Void,
  actions: { noop: Schema.Void },
})

const RegionHostImpl = RegionHost.implement({
  initial: undefined,
  imports: [CascadingForm.impl, RegionQuery.impl],
})

const regionLayer = Layer.mergeAll(Logix.Resource.layer([ProvinceSpec, CitySpec]), Query.layer(new QueryClient()))

const runtime = Logix.Runtime.make(RegionHostImpl, {
  label: "FormCase.RegionCascading",
  devtools: true,
  layer: regionLayer,
  middleware: [Query.TanStack.middleware()],
})

const RegionCascadingCase: React.FC = () => {
  const form = useForm(CascadingForm)
  const formState = useSelector(form.runtime as any) as any
  const dispatchForm = useDispatch(form.runtime as any)

  const queryRuntime = useModule(RegionQuery.module)
  const queryState = useSelector(queryRuntime, (s) => s) as any
  const dispatchQuery = useDispatch(queryRuntime)

  const provincesSnap = queryState?.provinces
  const citiesSnap = queryState?.cities

  const provinces: ReadonlyArray<string> = provincesSnap?.status === "success" ? (provincesSnap.data ?? []) : []
  const cities: ReadonlyArray<string> = citiesSnap?.status === "success" ? (citiesSnap.data ?? []) : []

  const setCountry = (country: string) => {
    dispatchForm({ _tag: "setValue", payload: { path: "country", value: country } })
    dispatchForm({ _tag: "setValue", payload: { path: "province", value: "" } })
    dispatchForm({ _tag: "setValue", payload: { path: "city", value: "" } })
    dispatchQuery({ _tag: "setParams", payload: { ...queryState.params, country, province: "" } })
  }

  const setProvince = (province: string) => {
    dispatchForm({ _tag: "setValue", payload: { path: "province", value: province } })
    dispatchForm({ _tag: "setValue", payload: { path: "city", value: "" } })
    dispatchQuery({ _tag: "setParams", payload: { ...queryState.params, province } })
  }

  const setCity = (city: string) => {
    dispatchForm({ _tag: "setValue", payload: { path: "city", value: city } })
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
                value={String(formState?.country ?? "CN")}
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
                  value={String(formState?.province ?? "")}
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
                  provinces: {String(provincesSnap?.status ?? "idle")}
                </div>
              </label>

              <label className="block text-sm text-gray-700 dark:text-gray-200">
                City
                <select
                  value={String(formState?.city ?? "")}
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
                  cities: {String(citiesSnap?.status ?? "idle")}
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => dispatchForm({ _tag: "submit", payload: undefined })}>
                提交
              </PrimaryButton>
              <GhostButton
                type="button"
                onClick={() =>
                  dispatchQuery({
                    _tag: "setUi",
                    payload: { query: { autoEnabled: !Boolean(queryState?.ui?.query?.autoEnabled) } },
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
  id: "08",
  title: "级联选择",
  to: "region-cascading",
  desc: "form + query 同 runtime",
  element: <RegionCascadingPage />,
}

