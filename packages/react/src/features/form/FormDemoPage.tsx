import * as Schema from "effect/Schema"
import type { FormEvent } from "react"
import * as FormPkg from "./pkg"

const LoginFormSchema = Schema.Struct({
  email: Schema.String.pipe(
    Schema.minLength(5, {
      message: () => "邮箱至少需要 5 个字符",
    }),
  ),
  password: Schema.String.pipe(
    Schema.minLength(8, {
      message: () => "密码至少需要 8 个字符",
    }),
    Schema.maxLength(32, {
      message: () => "密码不能超过 32 个字符",
    }),
  ),
})

type LoginForm = Schema.Schema.Type<typeof LoginFormSchema>

const initialValues: LoginForm = {
  email: "",
  password: "",
}

export function FormDemoPage() {
  const form = FormPkg.ReactForm.useForm(LoginFormSchema, initialValues)

  if (!form) {
    return <div>表单运行时初始化中...</div>
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.submit()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">表单 Demo：登录表单</h2>
        <p className="text-sm text-gray-600">
          这是一个使用 Effect 驱动的简单登录表单
          Demo，后续可以把下方的表单状态管理逻辑抽到独立库中复用。
        </p>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border rounded-lg p-4 shadow-sm bg-white"
        >
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.values.email}
              onChange={(e) => {
                form.setField("email", e.target.value)
              }}
              placeholder="you@example.com"
            />
            {form.errors.email && (
              <p className="text-xs text-red-500 mt-1">{form.errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.values.password}
              onChange={(e) => {
                form.setField("password", e.target.value)
              }}
              placeholder="至少 6 位字符"
            />
            {form.errors.password && (
              <p className="text-xs text-red-500 mt-1">
                {form.errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.isSubmitting}
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {form.isSubmitting ? "提交中..." : "提交"}
          </button>
        </form>

        <div className="space-y-3 text-xs">
          <div>
            <div className="font-medium mb-1">当前表单值 (values$)</div>
            <pre className="bg-gray-50 border rounded p-2 overflow-auto">
              {JSON.stringify(form.values, null, 2)}
            </pre>
          </div>

          <div>
            <div className="font-medium mb-1">当前错误信息 (errors$)</div>
            <pre className="bg-gray-50 border rounded p-2 overflow-auto">
              {JSON.stringify(form.errors, null, 2)}
            </pre>
          </div>

          <div>
            <div className="font-medium mb-1">表单状态</div>
            <pre className="bg-gray-50 border rounded p-2 overflow-auto">
              {JSON.stringify(
                { isValid: form.isValid, isSubmitting: form.isSubmitting },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
