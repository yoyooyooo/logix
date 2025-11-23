import { Schema } from 'effect'
import { useForm, Field, useFormState, type FormControl } from '../index'
import { useRef, useState } from 'react'
import { FormValuesPanel } from './components/FormValuesPanel'

const LoginFormSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
})

type LoginForm = Schema.Schema.Type<typeof LoginFormSchema>

const initialValues: LoginForm = {
  email: '',
  password: '',
}

// 独立的提交按钮组件，只订阅 isSubmitting
// 这样输入时按钮不会重渲染
function SubmitButton({ control }: { control: FormControl<LoginForm> | null }) {
  const { isSubmitting, isValid, isDirty } = useFormState(control)

  // 渲染计数器，用于验证性能
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="flex items-center gap-4">
      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '提交中...' : '提交'}
      </button>
      <span className="text-xs text-gray-400">Render: {renderCount.current}</span>
      <span className="text-xs text-gray-400">Dirty: {String(isDirty)}</span>
    </div>
  )
}

export function BasicFormPage() {
  const [mode, setMode] = useState<'onChange' | 'onBlur' | 'onSubmit' | 'all'>('onBlur')
  const [reValidateMode, setReValidateMode] = useState<'onChange' | 'onBlur' | 'onSubmit' | 'all'>('onChange')

  // 1. Headless 初始化：mode/reValidateMode 只通过内部 setValidationOptions 下发，不会重建 Store
  const form = useForm(LoginFormSchema, initialValues, { mode, reValidateMode })

  // 渲染计数器
  const renderCount = useRef(0)
  renderCount.current++

  if (!form.control) return <div>初始化中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">基础表单与校验时机</h2>
          <p className="text-sm text-gray-600">Headless 架构 + 细粒度订阅，演示不同校验模式。</p>
          <p className="text-xs text-gray-400 mt-1">Parent Render Count: {renderCount.current}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="space-x-2">
            <span className="text-gray-600">mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="onChange">onChange</option>
              <option value="onBlur">onBlur</option>
              <option value="onSubmit">onSubmit</option>
              <option value="all">all</option>
            </select>
          </label>
          <label className="space-x-2">
            <span className="text-gray-600">reValidate</span>
            <select
              value={reValidateMode}
              onChange={(e) => setReValidateMode(e.target.value as typeof reValidateMode)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="onChange">onChange</option>
              <option value="onBlur">onBlur</option>
              <option value="onSubmit">onSubmit</option>
              <option value="all">all</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <form
          onSubmit={form.handleSubmit((data) => {
            console.log('Form Submitted:', data)
            alert(JSON.stringify(data, null, 2))
          })}
          className="space-y-4 border rounded-lg p-4 shadow-sm bg-white"
        >
          {/* 方式 A: RHF 风格 (简单场景) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">邮箱 (register)</label>
            <input
              {...form.register('email')}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
            <Field control={form.control} name="email">
              {({ error, isTouched }) =>
                error && isTouched ? <p className="text-xs text-red-500 mt-1">{error}</p> : null
              }
            </Field>
          </div>

          {/* 方式 B: TanStack 风格 (推荐，自包含逻辑) */}
          <Field control={form.control} name="password">
            {({ value, handleChange, handleBlur, error, isTouched }) => (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">密码 (Field)</label>
                <input
                  type="password"
                  value={value as string}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="至少 6 位字符"
                />
                {error && isTouched && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            )}
          </Field>

          <div className="pt-2">
            <SubmitButton control={form.control} />
          </div>
        </form>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>说明：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>通过 mode/reValidate 切换校验触发策略。</li>
              <li>保持父组件渲染次数稳定（Headless）。</li>
              <li>结合 register 与 Field 两种使用方式。</li>
              <li>提交失败后 reValidateMode 生效。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
