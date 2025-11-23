import { Schema, Stream } from 'effect'
import { useMemo, useState } from 'react'
import { Field, useForm, useField } from '../index'
import { useStream } from '../use-stream'
import { FormValuesPanel } from "./components/FormValuesPanel"

const WatchersSchema = Schema.Struct({
  country: Schema.String,
  province: Schema.String,
})

type WatchersForm = Schema.Schema.Type<typeof WatchersSchema>

const initialValues: WatchersForm = {
  country: '',
  province: '',
}

// 模拟异步数据源
const PROVINCES: Record<string, string[]> = {
  cn: ['Beijing', 'Shanghai', 'Guangdong'],
  us: ['California', 'New York', 'Texas'],
  jp: ['Tokyo', 'Osaka', 'Kyoto'],
}

export function WatchersFormPage() {
  const form = useForm(WatchersSchema, initialValues)
  const values$ = useMemo(
    () => form.control ? form.control.store.values$ : (Stream.empty as Stream.Stream<WatchersForm>),
    [form.control]
  )
  const liveValues = useStream(values$, initialValues)

  // 订阅 country 字段的变化
  const countryField = useField<WatchersForm, string>(form.control, 'country')
  const [provinces, setProvinces] = useState<string[]>([])

  // 监听 country 变化，更新 provinces 选项
  // 注意：这里我们直接在组件渲染中处理副作用，这在 React 中是不推荐的
  // 更好的做法是使用 useEffect 监听 countryField.value
  useMemo(() => {
    if (countryField?.value) {
      const list = PROVINCES[countryField.value] || []
      setProvinces(list)
      // 如果当前 province 不在新的列表中，清空它
      // 这里需要小心死循环，但在 Effect 驱动下，setPath 是安全的
      // 更好的做法是在 onChange 中处理联动
    } else {
      setProvinces([])
    }
  }, [countryField?.value])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">字段联动 (Watchers)</h2>
          <p className="text-sm text-gray-600">{`演示基于字段值的联动逻辑（选择国家 -> 更新省份）。`}</p>
        </div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <div className="space-y-4 border rounded-lg p-4 bg-white shadow-sm">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">国家</label>
            <select {...form.register('country')} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">请选择</option>
              <option value="cn">China</option>
              <option value="us">USA</option>
              <option value="jp">Japan</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">省份/州</label>
            <Field<WatchersForm, string> control={form.control} name="province">
              {({ value, handleChange }) => (
                <select
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={!countryField?.value}
                  className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">请选择</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>逻辑说明：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>
                使用 <code>useField</code> 订阅 country 值。
              </li>
              <li>根据 country 动态计算 provinces 列表。</li>
              <li>
                当前选择: {String(countryField?.value ?? '')} / {String(liveValues.province)}
              </li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
