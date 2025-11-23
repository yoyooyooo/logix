import { Schema } from "effect"
import { useState } from "react"
import { useField, useForm, useFormState } from "../index"
import { FormValuesPanel } from "./components/FormValuesPanel"

const ViewSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  city: Schema.String
})

type ViewForm = Schema.Schema.Type<typeof ViewSchema>

const initialValues: ViewForm = {
  name: "Imile",
  email: "hello@example.com",
  city: "上海"
}

export function ViewModeFormPage() {
  const [viewOnly, setViewOnly] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const form = useForm(ViewSchema, initialValues, { mode: "onSubmit", reValidateMode: "onChange" })

  const nameField = useField<ViewForm, string>(form.control, "name")
  const emailField = useField<ViewForm, string>(form.control, "email")
  const cityField = useField<ViewForm, string>(form.control, "city")
  const state = useFormState(form.control)

  if (!form.control || !nameField || !emailField || !cityField) return <div>初始化中...</div>

  const renderField = (label: string, field: typeof nameField) => {
    if (!field) return null
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span>{label}</span>
        </div>
        {viewOnly ? (
          <div className="px-3 py-2 rounded border bg-gray-50 text-sm text-gray-800">{field.value}</div>
        ) : (
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={field.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            disabled={disabled}
          />
        )}
        {field.error && !viewOnly && <p className="text-xs text-red-500">{field.error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">查看 / 禁用模式</h2>
          <p className="text-sm text-gray-600">模拟 RHF 的 query/disabled 场景，表单交互完全在 headless store 内完成。</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={viewOnly} onChange={(e) => setViewOnly(e.target.checked)} />
            <span>只读模式</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            <span>禁用输入</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <form
          onSubmit={form.handleSubmit((data) => alert("提交: " + JSON.stringify(data, null, 2)))}
          className="space-y-4 border rounded-lg p-4 shadow-sm bg-white"
        >
          {renderField("姓名", nameField)}
          {renderField("邮箱", emailField)}
          {renderField("城市", cityField)}

          <div className="pt-2 flex items-center gap-3 text-sm">
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交
            </button>
            <span className="text-gray-500">submitCount: {state.submitCount}</span>
            <span className="text-gray-500">isDirty: {String(state.isDirty)}</span>
          </div>
        </form>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>说明：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>只读模式下改用静态文本渲染，状态仍由 store 托管。</li>
              <li>禁用状态仅影响输入控件，headless 层保持一致。</li>
              <li>适配“查看模式/禁用模式”需求，无需额外 API。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
