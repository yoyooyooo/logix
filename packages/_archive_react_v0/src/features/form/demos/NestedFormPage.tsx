import { Schema, Stream } from "effect"
import { useMemo } from "react"
import { Field, useForm, useField } from "../index"
import { useStream } from "../use-stream"
import { FormValuesPanel } from "./components/FormValuesPanel"

const NestedSchema = Schema.Struct({
  profile: Schema.Struct({
    name: Schema.String,
    address: Schema.Struct({
      city: Schema.String,
      street: Schema.String,
      zip: Schema.String
    })
  })
})

type NestedForm = Schema.Schema.Type<typeof NestedSchema>

const initialValues: NestedForm = {
  profile: {
    name: "",
    address: {
      city: "",
      street: "",
      zip: ""
    }
  }
}

export function NestedFormPage() {
  const form = useForm(NestedSchema, initialValues, { mode: "onBlur", reValidateMode: "onChange" })
  const errors$ = useMemo(
    () => form.control ? form.control.store.errors$ : (Stream.empty as Stream.Stream<Record<string, string>>),
    [form.control]
  )
  const errors = useStream(errors$, {})
  const profileField = useField<NestedForm, NestedForm['profile']>(form.control, "profile")

  if (!profileField) return <div>初始化中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">嵌套对象字段</h2>
          <p className="text-sm text-gray-600">用 Field 包裹整个嵌套对象，内部以局部对象更新，验证走 Schema 路径。</p>
        </div>
        <div className="text-xs text-gray-500">校验: onBlur / reValidate onChange</div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <Field<NestedForm, NestedForm['profile']> control={form.control} name="profile">
          {({ value, handleChange, handleBlur }) => (
            <div className="space-y-4 border rounded-lg p-4 bg-white shadow-sm">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input
                  value={value.name}
                  onChange={(e) => handleChange({ ...value, name: e.target.value })}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="张三"
                />
                {errors["profile.name"] && <p className="text-xs text-red-500 mt-1">{errors["profile.name"]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">城市</label>
                  <input
                    value={value.address.city}
                    onChange={(e) => handleChange({ ...value, address: { ...value.address, city: e.target.value } })}
                    onBlur={handleBlur}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="上海"
                  />
                  {errors["profile.address.city"] && <p className="text-xs text-red-500 mt-1">{errors["profile.address.city"]}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">街道</label>
                  <input
                    value={value.address.street}
                    onChange={(e) => handleChange({ ...value, address: { ...value.address, street: e.target.value } })}
                    onBlur={handleBlur}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="幸福路 88 号"
                  />
                  {errors["profile.address.street"] && <p className="text-xs text-red-500 mt-1">{errors["profile.address.street"]}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">邮编</label>
                <input
                  value={value.address.zip}
                  onChange={(e) => handleChange({ ...value, address: { ...value.address, zip: e.target.value } })}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="200000"
                />
                {errors["profile.address.zip"] && <p className="text-xs text-red-500 mt-1">{errors["profile.address.zip"]}</p>}
              </div>
            </div>
          )}
        </Field>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>观察点：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>字段值、错误来自 Effect store，嵌套对象局部更新。</li>
              <li>只订阅 profile 切片，父组件不重渲染。</li>
              <li>错误根据 Schema 路径映射到最后一级 key。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
