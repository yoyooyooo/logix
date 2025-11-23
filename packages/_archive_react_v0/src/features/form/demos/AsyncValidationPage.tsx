import { Effect, Schema } from "effect"
import { useCallback, useMemo, useState } from "react"
import { Field, useForm, useFormState, type FormControl } from "../index"
import { FormValuesPanel } from "./components/FormValuesPanel"

const UsernameSchema = Schema.Struct({
  username: Schema.String,
  email: Schema.String
})

type UsernameForm = Schema.Schema.Type<typeof UsernameSchema>

const initialValues: UsernameForm = {
  username: "",
  email: ""
}

type CheckState = "idle" | "checking" | "available" | "taken"

function AsyncStatus({ control }: { control: FormControl<UsernameForm> }) {
  const { isSubmitting, isValid } = useFormState(control)
  return (
    <div className="flex items-center gap-3 text-xs text-gray-600">
      <span>isValid: {String(isValid)}</span>
      <span>isSubmitting: {String(isSubmitting)}</span>
    </div>
  )
}

export function AsyncValidationPage() {
  const form = useForm(UsernameSchema, initialValues, { mode: "onBlur", reValidateMode: "onChange" })
  const [checkState, setCheckState] = useState<CheckState>("idle")
  const [remoteError, setRemoteError] = useState<string | null>(null)

  const runCheck = useCallback((value: string) => {
    if (!form.control) return
    const control = form.control
    const program = Effect.gen(function* () {
      setCheckState("checking")
      setRemoteError(null)
      // 模拟 API 延迟与占用校验
      yield* Effect.sleep("500 millis")
      if (value.trim().toLowerCase() === "taken") {
        setCheckState("taken")
        setRemoteError("用户名已被占用（模拟远端校验）")
      } else {
        setCheckState("available")
        setRemoteError(null)
      }
      // 触发一次同步校验，确保错误态回写到 store
      yield* control.store.validate
    })

    Effect.runFork(program)
  }, [form.control])

  const disableSubmit = useMemo(() => checkState === "checking" || checkState === "taken", [checkState])

  if (!form.control) return <div>初始化中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">异步校验（模拟远端唯一性）</h2>
          <p className="text-sm text-gray-600">onBlur 触发异步校验，失败后切换到 reValidateMode。</p>
        </div>
        <AsyncStatus control={form.control} />
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <form
          onSubmit={form.handleSubmit((data) => {
            alert("提交成功: " + JSON.stringify(data, null, 2))
          })}
          className="space-y-4 border rounded-lg p-4 shadow-sm bg-white"
        >
          <Field<UsernameForm, string> control={form.control} name="username">
            {({ value, handleChange, handleBlur, error, isTouched }) => (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">用户名</label>
                <input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={() => {
                    handleBlur()
                    runCheck(value)
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="输入 taken 触发占用"
                />
                {(error && isTouched) && <p className="text-xs text-red-500">{error}</p>}
                {remoteError && <p className="text-xs text-red-500">{remoteError}</p>}
                {checkState === "checking" && <p className="text-xs text-gray-500">远端校验中...</p>}
                {checkState === "available" && <p className="text-xs text-green-600">可用</p>}
              </div>
            )}
          </Field>

          <Field<UsernameForm, string> control={form.control} name="email">
            {({ value, handleChange, handleBlur, error, isTouched }) => (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="user@example.com"
                />
                {error && isTouched && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={disableSubmit}
              className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkState === "checking" ? "远端校验中..." : "提交"}
            </button>
          </div>
        </form>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>说明：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>onBlur 启动异步校验，模拟服务端唯一性。</li>
              <li>校验失败时禁用提交，成功后回归正常流。</li>
              <li>结合 reValidateMode=onChange，输入修正后自动重新校验。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
