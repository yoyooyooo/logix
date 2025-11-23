import { Schema } from "effect"
import { useRef } from "react"
import { Field, useForm, useFormState } from "../index"
import { FormValuesPanel } from "./components/FormValuesPanel"

const PerfSchema = Schema.Struct({
  username: Schema.String,
  bio: Schema.String
})

type PerfForm = Schema.Schema.Type<typeof PerfSchema>

const initialValues: PerfForm = {
  username: "",
  bio: ""
}

function RenderCounter({ label }: { label: string }) {
  const ref = useRef(0)
  ref.current += 1
  return <span className="text-xs text-gray-500">{label} Render: {ref.current}</span>
}

export function PerformanceFormPage() {
  const form = useForm(PerfSchema, initialValues, { mode: "onChange" })
  const parentRender = useRef(0)
  parentRender.current += 1

  const formState = useFormState(form.control)

  if (!form.control) return <div>初始化中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">性能与渲染颗粒度</h2>
          <p className="text-sm text-gray-600">通过渲染计数器验证 headless + useField 只刷新必要节点。</p>
        </div>
        <RenderCounter label="Parent" />
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <div className="space-y-4 border rounded-lg p-4 bg-white shadow-sm">
          <Field<PerfForm, string> control={form.control} name="username">
            {({ value, handleChange, handleBlur, error }) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">用户名</label>
                  <RenderCounter label="Username Field" />
                </div>
                <input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="不会触发父组件重渲染"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </Field>

          <Field<PerfForm, string> control={form.control} name="bio">
            {({ value, handleChange, handleBlur }) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">个人简介</label>
                  <RenderCounter label="Bio Field" />
                </div>
                <textarea
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="较大文本区域，验证场景"
                />
              </div>
            )}
          </Field>

          <button
            type="button"
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            onClick={() => alert("isDirty: " + formState.isDirty)}
          >
            查看脏状态
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>观察点：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Parent Render 仅初始化+提交时变化。</li>
              <li>每个 Field 独立计数，互不影响。</li>
              <li>结合 useFormState 查看全局 isDirty/isValid。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
