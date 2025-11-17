import React from 'react'
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule } from '@logix/react'
import * as Form from '@logix/form'
import { useField, useFormState } from '@logix/form/react'

const ValuesSchema = Schema.Struct({
  value: Schema.String,
})

type Values = Schema.Schema.Type<typeof ValuesSchema>

const $ = Form.from(ValuesSchema)
const z = $.rules

const DemoForm = Form.make('FormDemo', {
  values: ValuesSchema,
  initialValues: {
    value: '',
  },
  rules: z(
    z.field('value', {
      required: '值不能为空',
    }),
  ),
})

const runtime = Logix.Runtime.make(DemoForm, {
  label: 'FormDemoRuntime',
  devtools: true,
})

const DemoFormView: React.FC = () => {
  const form = useModule(DemoForm)
  const view = useFormState(form, (v) => v)
  const field = useField(form, 'value')

  const onReset = () => {
    void Effect.runPromise(form.controller.reset())
  }

  const onSubmit = () => {
    void Effect.runPromise(
      form.controller.handleSubmit({
        onValid: (_values: Values) => Effect.void,
        onInvalid: () => Effect.void,
      }) as Effect.Effect<void, any, never>,
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">简单表单</h3>
        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
          Module + Logic + Runtime
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          输入值
          <input
            type="text"
            value={String(field.value ?? '')}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
            placeholder="输入一些内容..."
          />
        </label>

        {Boolean(field.error) && <p className="text-xs text-red-600 dark:text-red-400">{String(field.error)}</p>}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>dirty：{view.isDirty ? '是' : '否'}</span>
          <span>valid：{view.isValid ? '是' : '否'}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            onClick={onReset}
          >
            重置
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
            disabled={!view.canSubmit}
            onClick={onSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}

export const FormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">表单示例 · Intent 驱动的表单逻辑</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            本示例展示了如何使用{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              Logix.Module
            </code>{' '}
            +{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              Module.logic
            </code>{' '}
            +{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              Logix.Runtime.make
            </code>
            建模一个简单表单场景，包含脏标记与基础校验逻辑。
          </p>
        </div>

        <div className="pt-2">
          <DemoFormView />
        </div>
      </div>
    </RuntimeProvider>
  )
}
