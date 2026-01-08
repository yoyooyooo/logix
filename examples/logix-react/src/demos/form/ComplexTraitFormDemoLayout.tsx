import React from 'react'
import { Effect, Schema, type Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import { useField, useFieldArray, useFormState } from '@logixjs/form/react'

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    fullName: Schema.String,
  }),
  contact: Schema.Struct({
    email: Schema.String,
    phone: Schema.String,
    preferredChannel: Schema.Literal('email', 'phone'),
  }),
  shipping: Schema.Struct({
    recipientName: Schema.String,
    contactEmail: Schema.String,
  }),
  items: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      quantity: Schema.Number,
      price: Schema.Number,
    }),
  ),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>

const $ = Form.from(ValuesSchema)

const ComplexForm = Form.make('ComplexFormDemo', {
  values: ValuesSchema,
  initialValues: {
    profile: {
      firstName: '',
      lastName: '',
      fullName: '',
    },
    contact: {
      email: '',
      phone: '',
      preferredChannel: 'email',
    },
    shipping: {
      recipientName: '',
      contactEmail: '',
    },
    items: [{ name: '', quantity: 1, price: 0 }],
  } satisfies Values,
  validateOn: ['onBlur'],
  reValidateOn: ['onChange'],
  traits: $.traits({
    'contact.email': {
      check: {
        requiredAndFormat: {
          validate: (value) => {
            const email = typeof value === 'string' ? value.trim() : ''
            if (!email) return '请填写邮箱'
            if (!email.includes('@')) return '邮箱格式不正确'
            return undefined
          },
        },
      },
    },

    'contact.phone': {
      check: {
        requiredWhenPhone: {
          deps: ['contact.preferredChannel'],
          validate: (value, ctx) => {
            const state = ctx.state as any
            if (state?.contact?.preferredChannel !== 'phone') return undefined
            const phone = typeof value === 'string' ? value.trim() : ''
            return phone ? undefined : '当首选渠道为电话时，手机号必填'
          },
        },
      },
    },

    items: {
      item: {
        check: {
          rowFields: {
            deps: ['name', 'quantity', 'price'],
            validate: (row) => {
              const errors: Record<string, unknown> = {}
              const name = String((row as any)?.name ?? '').trim()
              if (!name) errors.name = '名称必填'

              const quantity = (row as any)?.quantity
              if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
                errors.quantity = '数量需大于 0'
              }

              const price = (row as any)?.price
              if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
                errors.price = '价格需大于等于 0'
              }

              return Object.keys(errors).length > 0 ? errors : undefined
            },
          },
        },
      },
      list: {
        check: {
          atLeastOneRow: {
            validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: '至少需要一行商品' }),
          },
        },
      },
    },
  }),
  derived: $.derived({
    'profile.fullName': Form.computed({
      deps: ['profile.firstName', 'profile.lastName'],
      get: (firstName, lastName) => `${firstName} ${lastName}`.trim(),
    }),
    'shipping.recipientName': Form.link({ from: 'profile.fullName' }),
    'shipping.contactEmail': Form.link({ from: 'contact.email' }),

    'ui.summary.itemCount': Form.computed({
      deps: ['items'],
      get: (items) => items.length,
    }),
    'ui.summary.totalQuantity': Form.computed({
      deps: ['items'],
      get: (items) => items.reduce((acc: number, item: Values['items'][number]) => acc + item.quantity, 0),
    }),
    'ui.summary.totalAmount': Form.computed({
      deps: ['items'],
      get: (items) => items.reduce((acc: number, item: Values['items'][number]) => acc + item.quantity * item.price, 0),
    }),
  }),
})

const runtime = Logix.Runtime.make(ComplexForm, {
  label: 'ComplexFormDemoRuntime',
  devtools: true,
})

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const readSummary = (
  ui: unknown,
): { readonly itemCount: number; readonly totalQuantity: number; readonly totalAmount: number } => {
  const summary =
    ui && typeof ui === 'object' && !Array.isArray(ui) && (ui as any).summary && typeof (ui as any).summary === 'object'
      ? (ui as any).summary
      : undefined

  return {
    itemCount: readNumber(summary?.itemCount, 0),
    totalQuantity: readNumber(summary?.totalQuantity, 0),
    totalAmount: readNumber(summary?.totalAmount, 0),
  }
}

const ItemRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, canRemove, onRemove }) => {
  const name = useField(form, `items.${index}.name`)
  const quantity = useField(form, `items.${index}.quantity`)
  const price = useField(form, `items.${index}.price`)

  const onChangeNumber = (field: typeof quantity | typeof price) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const num = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(num)) return
    field.onChange(num)
  }

  return (
    <div
      key={fieldsId}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Item #{index + 1}</div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          删除
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="space-y-1">
          <input
            type="text"
            value={String(name.value ?? '')}
            onChange={(e) => name.onChange(e.target.value)}
            onBlur={name.onBlur}
            placeholder="名称"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {name.error != null && <p className="text-[11px] text-red-600 dark:text-red-400">{String(name.error)}</p>}
        </div>

        <div className="space-y-1">
          <input
            type="number"
            value={String(quantity.value ?? 0)}
            onChange={onChangeNumber(quantity)}
            onBlur={quantity.onBlur}
            placeholder="数量"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {quantity.error != null && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{String(quantity.error)}</p>
          )}
        </div>

        <div className="space-y-1">
          <input
            type="number"
            value={String(price.value ?? 0)}
            onChange={onChangeNumber(price)}
            onBlur={price.onBlur}
            placeholder="价格"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {price.error != null && <p className="text-[11px] text-red-600 dark:text-red-400">{String(price.error)}</p>}
        </div>
      </div>
    </div>
  )
}

const ComplexFormView: React.FC = () => {
  const form = useModule(ComplexForm)
  const state = useSelector(form) as any
  const view = useFormState(form, (v) => v)

  const firstName = useField(form, 'profile.firstName')
  const lastName = useField(form, 'profile.lastName')
  const email = useField(form, 'contact.email')
  const phone = useField(form, 'contact.phone')
  const preferredChannel = useField(form, 'contact.preferredChannel')

  const itemsArray = useFieldArray(form, 'items')
  const items: ReadonlyArray<any> = Array.isArray(state?.items) ? state.items : []
  const canRemove = items.length > 0
  const itemsListError = state?.errors?.items?.$list

  const summary = readSummary(state?.ui)

  const onSubmit = () => {
    void Effect.runPromise(
      form.controller.handleSubmit({
        onValid: (_values: Values) => Effect.void,
        onInvalid: () => Effect.void,
      }) as Effect.Effect<void, any, never>,
    )
  }

  const isValid = Boolean(view?.isValid)

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ComplexForm · @logixjs/form（derived + rules + list）
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这个示例把表单建模为 Form Module：values 只关心业务字段；联动/聚合写在 derived；校验写在 rules 并落到 errors
          树，UI 侧通过 hooks 订阅最小视图。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={String(firstName.value ?? '')}
                  onChange={(e) => firstName.onChange(e.target.value)}
                  onBlur={firstName.onBlur}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={String(lastName.value ?? '')}
                  onChange={(e) => lastName.onChange(e.target.value)}
                  onBlur={lastName.onBlur}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name（computed）</label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.profile?.fullName || <span className="text-gray-400">尚未填写</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contact</h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={String(email.value ?? '')}
                  onChange={(e) => email.onChange(e.target.value)}
                  onBlur={email.onBlur}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {email.error != null && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{String(email.error)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={String(phone.value ?? '')}
                  onChange={(e) => phone.onChange(e.target.value)}
                  onBlur={phone.onBlur}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {phone.error != null && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{String(phone.error)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Channel</label>
                <select
                  value={String(preferredChannel.value ?? 'email')}
                  onChange={(e) => preferredChannel.onChange(e.target.value)}
                  onBlur={preferredChannel.onBlur}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Shipping（link）</h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Recipient Name（from profile.fullName）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.shipping?.recipientName || <span className="text-gray-400">尚未填写</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contact Email（from contact.email）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.shipping?.contactEmail || <span className="text-gray-400">尚未填写</span>}
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
                  isValid
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                ].join(' ')}
              >
                isValid: {String(isValid)}
              </span>
            </div>

            {itemsListError != null && (
              <p className="text-[11px] text-red-600 dark:text-red-400">{String(itemsListError)}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">itemCount:</span>
                  <span className="text-blue-600 dark:text-blue-300">{summary.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">totalQuantity:</span>
                  <span className="text-blue-600 dark:text-blue-300">{summary.totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">totalAmount:</span>
                  <span className="text-blue-600 dark:text-blue-300">{summary.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">canSubmit:</span>
                  <span className="text-blue-600 dark:text-blue-300">{String(Boolean(view?.canSubmit))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">isDirty:</span>
                  <span className="text-blue-600 dark:text-blue-300">{String(Boolean(view?.isDirty))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">submit:</span>
                  <span className="text-blue-600 dark:text-blue-300">{String(view?.submitCount ?? 0)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 shadow-sm shadow-blue-600/20 disabled:opacity-50"
              disabled={!Boolean(view?.canSubmit)}
            >
              提交（controller.handleSubmit）
            </button>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Items（index 语义）</h3>
              <button
                type="button"
                onClick={() => itemsArray.append({ name: '', quantity: 1, price: 0 })}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                新增一行
              </button>
            </div>

            <div className="space-y-3">
              {items.map((_item, index) => (
                <ItemRow
                  key={itemsArray.fields[index]?.id ?? String(index)}
                  form={form as any}
                  fieldsId={itemsArray.fields[index]?.id ?? String(index)}
                  index={index}
                  canRemove={canRemove}
                  onRemove={itemsArray.remove}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export type ComplexTraitFormDemoLayoutProps = {
  readonly layer?: Layer.Layer<any, any, never>
}

export const ComplexTraitFormDemoLayout: React.FC<ComplexTraitFormDemoLayoutProps> = ({ layer }) => {
  return (
    <RuntimeProvider runtime={runtime} layer={layer}>
      <React.Suspense fallback={<div>ComplexForm 模块加载中…</div>}>
        <ComplexFormView />
      </React.Suspense>
    </RuntimeProvider>
  )
}
