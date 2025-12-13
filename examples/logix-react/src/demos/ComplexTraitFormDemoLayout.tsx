import React from 'react'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'
import {
  ComplexTraitFormImpl,
  ComplexTraitFormModule,
  type ComplexTraitFormState,
} from '../modules/complex-trait-form.js'

// 复杂表单 Traits 场景：
// - 多段基础信息 + 动态行项目；
// - profile / contact / shipping / items / summary / validation；
// - StateTrait.computed 负责验证与汇总；
// - StateTrait.link 负责 shipping 与 profile/contact 的联动。

const runtime = Logix.Runtime.make(ComplexTraitFormImpl, {
  label: 'ComplexTraitFormDemoRuntime',
  devtools: true,
})

const ComplexTraitFormView: React.FC = () => {
  const runtimeHandle = useModule(ComplexTraitFormModule)
  const state = useSelector(runtimeHandle) as ComplexTraitFormState
  const dispatch = useDispatch(runtimeHandle)

  const onProfileChange = (field: 'firstName' | 'lastName') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    dispatch({
      _tag: field === 'firstName' ? 'changeFirstName' : 'changeLastName',
      payload: value,
    })
  }

  const onContactChange = (field: 'email' | 'phone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    dispatch({
      _tag: field === 'email' ? 'changeEmail' : 'changePhone',
      payload: value,
    })
  }

  const onPreferredChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'email' | 'phone'
    dispatch({ _tag: 'changePreferredChannel', payload: value })
  }

  const onItemChange =
    (id: string, field: 'name' | 'quantity' | 'price') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (field === 'name') {
        dispatch({ _tag: 'changeItemName', payload: { id, name: raw } })
      } else {
        const num = raw === '' ? 0 : Number(raw)
        if (Number.isNaN(num)) return
        dispatch(
          field === 'quantity'
            ? { _tag: 'changeItemQuantity', payload: { id, quantity: num } }
            : { _tag: 'changeItemPrice', payload: { id, price: num } },
        )
      }
    }

  const onAddItem = () => {
    dispatch({ _tag: 'addItem', payload: undefined })
  }

  const onRemoveItem = (id: string) => () => {
    dispatch({ _tag: 'removeItem', payload: id })
  }

  const formValid = state.validation.formValid

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ComplexTraitForm · 复杂表单 Traits 压力测试
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这个示例通过一个偏复杂的“订单 + 联系信息”表单，演示 StateTrait 在计算字段、字段联动和表单校验上的组合用法。
          你可以在 DevTools 中结合 StateTransaction / TraitGraph / Timeline 观察一次输入如何触发多条 Trait 行为。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左列：Profile + Contact */}
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                StateTrait.computed
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={state.profile.firstName}
                  onChange={onProfileChange('firstName')}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={state.profile.lastName}
                  onChange={onProfileChange('lastName')}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Full Name (由 Traits 推导)
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state.profile.fullName || <span className="text-gray-400">请输入 first / last name</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contact</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                Validation Traits
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={state.contact.email}
                  onChange={onContactChange('email')}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  emailValid: {String(state.validation.emailValid)}
                </p>
                {state.errors.email && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {state.errors.email}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={state.contact.phone}
                  onChange={onContactChange('phone')}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  phoneRequired: {String(state.validation.phoneRequired)}
                </p>
                {state.errors.phone && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {state.errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Channel</label>
                <select
                  value={state.contact.preferredChannel}
                  onChange={onPreferredChannelChange}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* 中列：Shipping + Summary */}
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Shipping（联动字段）</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                StateTrait.link
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Recipient Name（跟随 profile.fullName）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state.shipping.recipientName || <span className="text-gray-400">尚未填写 profile</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contact Email（跟随 contact.email）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state.shipping.contactEmail || <span className="text-gray-400">尚未填写 email</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Summary &amp; Validation</h3>
              <span
                className={[
                  'px-2 py-0.5 rounded-full text-[10px] font-mono',
                  formValid
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                ].join(' ')}
              >
                formValid: {String(formValid)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">itemCount:</span>
                  <span className="text-blue-600 dark:text-blue-300">{state.summary.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">totalQuantity:</span>
                  <span className="text-blue-600 dark:text-blue-300">{state.summary.totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">totalAmount:</span>
                  <span className="text-blue-600 dark:text-blue-300">{state.summary.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">emailValid:</span>
                  <span>{String(state.validation.emailValid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">phoneRequired:</span>
                  <span>{String(state.validation.phoneRequired)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">hasInvalid:</span>
                  <span>{String(state.summary.hasInvalid)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                所有 summary / validation 字段都由 StateTrait.computed 维护。你可以只操作 profile / contact / items，
                然后在 DevTools 的 StateTransaction / Timeline 中观察这些字段如何在一次事务内统一更新。
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ _tag: 'submit', payload: undefined } as any)}
                  disabled={!state.validation.formValid}
                  className={[
                    'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    state.validation.formValid
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  提交表单
                </button>
                {state.submit.attempted && (
                  <span
                    className={
                      state.submit.result === 'success'
                        ? 'text-[11px] text-emerald-600 dark:text-emerald-300'
                        : 'text-[11px] text-red-600 dark:text-red-400'
                    }
                  >
                    {state.submit.result === 'success' ? '提交成功' : '提交失败，请修正上方错误'}
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 右列：Items 动态列表 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Items · 动态行项目</h3>
            <button
              type="button"
              onClick={onAddItem}
              className="inline-flex items-center px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              + 新增一行
            </button>
          </div>
          {state.errors.items && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
              {state.errors.items}
            </p>
          )}
          <div className="space-y-2 text-xs">
            {state.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr,80px,80px,auto] gap-2 items-center bg-gray-50 dark:bg-gray-800 rounded p-2"
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={onItemChange(item.id, 'name')}
                  placeholder="Item name"
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={onItemChange(item.id, 'quantity')}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                />
                <input
                  type="number"
                  value={item.price}
                  step="0.01"
                  onChange={onItemChange(item.id, 'price')}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                />
                <button
                  type="button"
                  onClick={onRemoveItem(item.id)}
                  className="ml-1 inline-flex items-center px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ComplexTraitFormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <React.Suspense fallback={<div>ComplexTraitForm 模块加载中…</div>}>
        <ComplexTraitFormView />
      </React.Suspense>
    </RuntimeProvider>
  )
}
