import { Schema } from "effect"
import { useState } from "react"
import { Field, useForm } from "../index"
import { FormValuesPanel } from "./components/FormValuesPanel"

const ModalSchema = Schema.Struct({
  subject: Schema.String,
  email: Schema.String,
  message: Schema.String
})

type ModalForm = Schema.Schema.Type<typeof ModalSchema>

const initialValues: ModalForm = {
  subject: "",
  email: "",
  message: ""
}

function ModalCard({ onClose }: { onClose: () => void }) {
  const form = useForm(ModalSchema, initialValues, { mode: "onBlur", reValidateMode: "onChange" })

  if (!form.control) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[540px] max-w-[90vw] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">弹窗内的表单</h3>
            <p className="text-sm text-gray-600">演示 FormStore 嵌在弹窗中，关闭即释放 Scope。</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">关闭</button>
        </div>

        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            alert("提交成功: " + JSON.stringify(values, null, 2))
            onClose()
          })}
        >
          <Field<ModalForm, string> control={form.control} name="subject">
            {({ value, handleChange, handleBlur, error }) => (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">主题</label>
                <input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="如：询价、反馈"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </Field>

          <Field<ModalForm, string> control={form.control} name="email">
            {({ value, handleChange, handleBlur, error }) => (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">邮箱</label>
                <input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </Field>

          <Field<ModalForm, string> control={form.control} name="message">
            {({ value, handleChange, handleBlur, error }) => (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">正文</label>
                <textarea
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={4}
                  placeholder="输入内容"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </Field>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                onClose()
              }}
              className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              提交
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ModalFormPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">弹窗表单</h2>
        <p className="text-sm text-gray-600">模拟 RHF 文档中的 modal 场景，表单随弹窗挂载/卸载。</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        打开表单弹窗
      </button>

      {open && <ModalCard onClose={() => setOpen(false)} />}
    </div>
  )
}

      {/* 即使弹窗未打开，也展示主控制器的实时值（便于调试） */}
      <FormValuesPanel control={null} title="弹窗关闭时暂无值" />
