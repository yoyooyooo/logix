import React, { useMemo, useRef } from 'react'
import { Effect, Layer, Schema, type Layer as FxLayer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import * as Form from '@logixjs/form'
import { useField, useFieldArray, useFormState } from '@logixjs/form/react'

const ChannelSchema = Schema.Union(Schema.Literal('email'), Schema.Literal('phone'))

const ItemSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
  quantity: Schema.Number,
  price: Schema.Number,
})

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    fullName: Schema.String,
    security: Schema.Struct({
      password: Schema.String,
      confirmPassword: Schema.String,
    }),
  }),
  contact: Schema.Struct({
    email: Schema.String,
    preferredChannel: ChannelSchema,
    phone: Schema.String,
  }),
  items: Schema.Array(ItemSchema),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>
type Item = Schema.Schema.Type<typeof ItemSchema>

const $ = Form.from(ValuesSchema)
const z = $.rules

const rules = z.schema(
  z.object({
    contact: z.object({
      email: z.field({ required: '请填写邮箱' }),
      preferredChannel: z.field({}),
      phone: z.field({
        validateOn: ['onBlur'],
        deps: ['preferredChannel'],
        validate: (phone, ctx) => {
          const state: any = ctx.state
          if (state.contact?.preferredChannel !== 'phone') return undefined
          return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，请填写手机号'
        },
      }),
    }),
    profile: z.object({
      firstName: z.field({}),
      lastName: z.field({}),
      security: z
        .object({
          password: z.field({ minLength: { min: 8, message: '密码至少 8 位' } }),
          confirmPassword: z.field({ required: '请再次输入密码' }),
        })
        .refine({
          deps: ['password', 'confirmPassword'],
          validate: (security: any) =>
            String(security?.password ?? '') === String(security?.confirmPassword ?? '') ? undefined : '两次密码不一致',
        }),
    }),
    items: z
      .array(
        z.object({
          warehouseId: z.field({}),
          quantity: z.field({ min: { min: 1, message: '数量必须 > 0' } }),
          price: z.field({ min: { min: 0, message: '价格不能为负' } }),
        }),
        { identity: { mode: 'trackBy', trackBy: 'id' } },
      )
      .refine({
        validate: {
          atLeastOne: (rows: ReadonlyArray<Item>) => ({
            $list: Array.isArray(rows) && rows.length > 0 ? undefined : '至少一行',
          }),
          uniqueWarehouse: {
            deps: ['warehouseId'],
            validate: (rows: ReadonlyArray<Item>) => {
              const indicesByValue = new Map<string, Array<number>>()
              for (let i = 0; i < rows.length; i++) {
                const v = String(rows[i]?.warehouseId ?? '').trim()
                if (!v) continue
                const bucket = indicesByValue.get(v) ?? []
                bucket.push(i)
                indicesByValue.set(v, bucket)
              }

              const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
              for (const dupIndices of indicesByValue.values()) {
                if (dupIndices.length <= 1) continue
                for (const i of dupIndices) {
                  rowErrors[i] = { warehouseId: '仓库选择需跨行互斥（当前重复）' }
                }
              }

              return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
            },
          },
        },
      }),
  }),
)

const ComplexForm = Form.make('ComplexFormDemo', {
  values: ValuesSchema,
  initialValues: {
    profile: {
      firstName: '',
      lastName: '',
      fullName: '',
      security: { password: '', confirmPassword: '' },
    },
    contact: { email: '', preferredChannel: 'email', phone: '' },
    items: [
      { id: 'row-0', warehouseId: '', quantity: 1, price: 0 },
      { id: 'row-1', warehouseId: '', quantity: 1, price: 0 },
    ],
  } satisfies Values,
  validateOn: ['onSubmit'],
  reValidateOn: ['onChange'],
  derived: $.derived({
    'profile.fullName': Form.computed({
      deps: ['profile.firstName', 'profile.lastName'],
      get: (first, last) => `${String(first ?? '')} ${String(last ?? '')}`.trim(),
    }),
  }),
  rules,
})

const runtime = Logix.Runtime.make(ComplexForm, {
  label: 'ComplexFormDemoRuntime',
  devtools: true,
  layer: Layer.empty as FxLayer.Layer<any, never, never>,
})

const ItemRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, canRemove, onRemove }) => {
  const id = useField(form, `items.${index}.id`)
  const warehouseId = useField(form, `items.${index}.warehouseId`)
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
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
          Row #{index + 1} · id={String(id.value ?? '')}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          删除
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="space-y-1">
          <input
            type="text"
            value={String(id.value ?? '')}
            onChange={(e) => id.onChange(e.target.value)}
            onBlur={id.onBlur}
            placeholder="row id"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {id.error != null && <p className="text-[11px] text-red-600 dark:text-red-400">{String(id.error)}</p>}
        </div>

        <div className="space-y-1">
          <input
            type="text"
            value={String(warehouseId.value ?? '')}
            onChange={(e) => warehouseId.onChange(e.target.value)}
            onBlur={warehouseId.onBlur}
            placeholder="warehouseId"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {warehouseId.error != null && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{String(warehouseId.error)}</p>
          )}
        </div>

        <div className="space-y-1">
          <input
            type="number"
            value={String(quantity.value ?? 0)}
            onChange={onChangeNumber(quantity)}
            onBlur={quantity.onBlur}
            placeholder="quantity"
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
            placeholder="price"
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
  const preferredChannel = useField(form, 'contact.preferredChannel')
  const phone = useField(form, 'contact.phone')

  const password = useField(form, 'profile.security.password')
  const confirmPassword = useField(form, 'profile.security.confirmPassword')

  const fullName = String(state?.profile?.fullName ?? '')
  const securitySelfError = state?.errors?.profile?.security?.$self

  const itemsArray = useFieldArray(form, 'items')
  const items: ReadonlyArray<any> = Array.isArray(state?.items) ? state.items : []
  const canRemove = items.length > 0
  const itemsListError = state?.errors?.items?.$list

  const nextIdRef = useRef(2)
  const newRow = () => {
    const n = nextIdRef.current++
    return { id: `row-${n}`, warehouseId: '', quantity: 1, price: 0 } satisfies Item
  }

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

  const manifest = useMemo(() => {
    try {
      return form.rulesManifest()
    } catch {
      return undefined
    }
  }, [form])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">复杂表单（推荐：rules + derived）</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            展示 $self（对象级 refine）+ list scope（$list/rows）+ trackBy identity + validateOn wiring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            onClick={onReset}
          >
            重置
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
            disabled={!view.canSubmit}
            onClick={onSubmit}
          >
            提交
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Profile</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">derived: fullName = firstName + lastName</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                type="text"
                value={String(firstName.value ?? '')}
                onChange={(e) => firstName.onChange(e.target.value)}
                onBlur={firstName.onBlur}
                placeholder="firstName"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {firstName.error != null && (
                <p className="text-[11px] text-red-600 dark:text-red-400">{String(firstName.error)}</p>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={String(lastName.value ?? '')}
                onChange={(e) => lastName.onChange(e.target.value)}
                onBlur={lastName.onBlur}
                placeholder="lastName"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {lastName.error != null && (
                <p className="text-[11px] text-red-600 dark:text-red-400">{String(lastName.error)}</p>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-200">
            fullName: <span className="font-mono">{fullName}</span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Security（$self refine）</div>
            {securitySelfError != null && (
              <div className="text-xs text-red-600 dark:text-red-400">{String(securitySelfError)}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <input
                  type="password"
                  value={String(password.value ?? '')}
                  onChange={(e) => password.onChange(e.target.value)}
                  onBlur={password.onBlur}
                  placeholder="password"
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {password.error != null && (
                  <p className="text-[11px] text-red-600 dark:text-red-400">{String(password.error)}</p>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="password"
                  value={String(confirmPassword.value ?? '')}
                  onChange={(e) => confirmPassword.onChange(e.target.value)}
                  onBlur={confirmPassword.onBlur}
                  placeholder="confirmPassword"
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {confirmPassword.error != null && (
                  <p className="text-[11px] text-red-600 dark:text-red-400">{String(confirmPassword.error)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Contact</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              phone 在 preferredChannel=phone 时必填（validateOn: onBlur）
            </div>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={String(email.value ?? '')}
              onChange={(e) => email.onChange(e.target.value)}
              onBlur={email.onBlur}
              placeholder="email"
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {email.error != null && <p className="text-[11px] text-red-600 dark:text-red-400">{String(email.error)}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <select
                value={String(preferredChannel.value ?? 'email')}
                onChange={(e) => preferredChannel.onChange(e.target.value)}
                onBlur={preferredChannel.onBlur}
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">email</option>
                <option value="phone">phone</option>
              </select>
              {preferredChannel.error != null && (
                <p className="text-[11px] text-red-600 dark:text-red-400">{String(preferredChannel.error)}</p>
              )}
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={String(phone.value ?? '')}
                onChange={(e) => phone.onChange(e.target.value)}
                onBlur={phone.onBlur}
                placeholder="phone"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {phone.error != null && (
                <p className="text-[11px] text-red-600 dark:text-red-400">{String(phone.error)}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">RulesManifest（lazy）</div>
            <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 font-mono">
              moduleId={manifest?.moduleId ?? '(unavailable)'} · lists={manifest?.lists?.length ?? 0} · rules=
              {manifest?.rules?.length ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Items（list scope）</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              identity: trackBy(id) · list-level: $list · item-level: rows[i].field
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
              onClick={() => itemsArray.append(newRow())}
            >
              追加一行
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
              onClick={() => itemsArray.swap(0, 1)}
              disabled={items.length < 2}
            >
              swap(0,1)
            </button>
          </div>
        </div>

        {itemsListError != null && (
          <div className="text-sm text-red-600 dark:text-red-400">{String(itemsListError)}</div>
        )}

        <div className="space-y-3">
          {itemsArray.fields.map((f, index) => (
            <ItemRow
              key={f.id}
              form={form}
              fieldsId={f.id}
              index={index}
              canRemove={canRemove}
              onRemove={itemsArray.remove}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const ComplexFormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <ComplexFormView />
    </RuntimeProvider>
  )
}
