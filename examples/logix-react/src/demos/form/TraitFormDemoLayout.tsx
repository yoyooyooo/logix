import React from 'react'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule } from '@logix/react'
import { TraitFormImpl, TraitFormModule, type TraitFormState } from '../../modules/trait-form.js'

// ToB 场景 1：表单脏标记由 Trait 统一管理

const runtime = Logix.Runtime.make(TraitFormImpl, {
  label: 'TraitFormDemoRuntime',
  devtools: true,
})

const TraitFormView: React.FC = () => {
  const form = useModule(TraitFormModule)
  const state = useModule(form, (s) => s as TraitFormState)

  const handleChange = (field: 'name' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (field === 'name') {
      form.actions.changeName(value)
      return
    }
    form.actions.changeEmail(value)
  }

  const handleReset = () => {
    form.actions.reset()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TraitForm · 表单脏标记</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            基于 StateTrait.computed，从 form / baseline 推导 dirtyCount / isDirty。
          </p>
        </div>
        <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          StateTrait · Form
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={state.form.name}
              onChange={handleChange('name')}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={state.form.email}
              onChange={handleChange('email')}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            重置为 baseline
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Baseline</div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">name:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.baseline.name || "''"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">email:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.baseline.email || "''"}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Traits.Meta</div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">dirtyCount:</span>
                <span className="text-blue-600 dark:text-blue-300">{state.meta.dirtyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">isDirty:</span>
                <span
                  className={
                    state.meta.isDirty ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'
                  }
                >
                  {String(state.meta.isDirty)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            TraitFormModule 的图纸中，meta.* 字段完全由 StateTrait.computed 维护，业务逻辑只负责修改 form /
            baseline；Devtools 中可以通过 StateTraitGraph + Timeline 观察这些字段是如何随用户输入变化的。
          </p>
        </div>
      </div>
    </div>
  )
}

export const TraitFormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <React.Suspense fallback={<div>TraitForm 模块加载中…</div>}>
        <TraitFormView />
      </React.Suspense>
    </RuntimeProvider>
  )
}
