import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'

// 复杂表单场景：
// - profile + contact + shipping 三块基础信息；
// - items 动态列表（订单行）；
// - summary / validation 完全由 field declarations 维护；
// - shipping.* 通过 field computed 从 profile / contact 联动。

export const ComplexFieldFormStateSchema = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    fullName: Schema.String,
  }),
  contact: Schema.Struct({
    email: Schema.String,
    phone: Schema.String,
    preferredChannel: Schema.Literals(['email', 'phone']),
  }),
  shipping: Schema.Struct({
    recipientName: Schema.String,
    contactEmail: Schema.String,
  }),
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      quantity: Schema.Number,
      price: Schema.Number,
    }),
  ),
  summary: Schema.Struct({
    itemCount: Schema.Number,
    totalQuantity: Schema.Number,
    totalAmount: Schema.Number,
    hasInvalid: Schema.Boolean,
  }),
  validation: Schema.Struct({
    emailValid: Schema.Boolean,
    phoneRequired: Schema.Boolean,
    formValid: Schema.Boolean,
  }),
  // UI 侧辅助字段：由字段声明 + Logic 一起驱动，用于错误提示与提交流程状态。
  errors: Schema.Struct({
    email: Schema.Union([Schema.String, Schema.Null]),
    phone: Schema.Union([Schema.String, Schema.Null]),
    items: Schema.Union([Schema.String, Schema.Null]),
  }),
  submit: Schema.Struct({
    attempted: Schema.Boolean,
    result: Schema.Literals(['idle', 'success', 'error']),
  }),
})

export type ComplexFieldFormState = Schema.Schema.Type<typeof ComplexFieldFormStateSchema>
type ComplexFieldFormItem = ComplexFieldFormState['items'][number]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isComplexFieldFormItem = (value: unknown): value is ComplexFieldFormItem =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.quantity === 'number' &&
  typeof value.price === 'number'

const toItemList = (value: unknown): ReadonlyArray<ComplexFieldFormItem> =>
  Array.isArray(value) ? value.filter(isComplexFieldFormItem) : []

const hasInvalidItem = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return true
  return value.some(
    (item) =>
      !isComplexFieldFormItem(item) || item.name.trim() === '' || item.quantity <= 0 || item.price < 0,
  )
}

const totalQuantityOf = (value: unknown): number =>
  toItemList(value).reduce((acc, item) => acc + item.quantity, 0)

const totalAmountOf = (value: unknown): number =>
  toItemList(value).reduce((acc, item) => acc + item.quantity * item.price, 0)

export const ComplexFieldFormActions = {
  changeFirstName: Schema.String,
  changeLastName: Schema.String,
  changeEmail: Schema.String,
  changePhone: Schema.String,
  changePreferredChannel: Schema.Literals(['email', 'phone']),

  addItem: Schema.Void,
  removeItem: Schema.String, // id
  changeItemName: Schema.Struct({ id: Schema.String, name: Schema.String }),
  changeItemQuantity: Schema.Struct({ id: Schema.String, quantity: Schema.Number }),
  changeItemPrice: Schema.Struct({ id: Schema.String, price: Schema.Number }),
  submit: Schema.Void,
}

// 简单的行项目工厂，用于新增行
let nextItemId = 1
const makeItem = () => ({
  id: `item-${nextItemId++}`,
  name: '',
  quantity: 1,
  price: 0,
})

// Field declarations：计算字段 + 联动字段 + 校验与汇总
export const ComplexFieldFormFields = FieldContracts.fieldFrom(ComplexFieldFormStateSchema)({
  // profile.fullName 由 firstName / lastName 推导
  'profile.fullName': FieldContracts.fieldComputed({
    deps: ['profile.firstName', 'profile.lastName'],
    get: (firstName, lastName) => `${firstName} ${lastName}`.trim(),
  }),

  // shipping.* 跟随 profile / contact 联动
  'shipping.recipientName': FieldContracts.fieldComputed({
    deps: ['profile.fullName'],
    get: (fullName) => String(fullName ?? ''),
  }),
  'shipping.contactEmail': FieldContracts.fieldComputed({
    deps: ['contact.email'],
    get: (email) => String(email ?? ''),
  }),

  // 验证字段
  'validation.emailValid': FieldContracts.fieldComputed({
    deps: ['contact.email'],
    get: (email) => {
      const trimmed = String(email ?? '').trim()
      // 这里只做一个非常宽松的校验，用于演示字段行为
      return trimmed === '' ? false : trimmed.includes('@')
    },
  }),
  'validation.phoneRequired': FieldContracts.fieldComputed({
    deps: ['contact.preferredChannel', 'contact.phone'],
    get: (preferredChannel, phone) => preferredChannel === 'phone' && String(phone ?? '').trim() === '',
  }),
  'validation.formValid': FieldContracts.fieldComputed({
    deps: ['contact.email', 'contact.preferredChannel', 'contact.phone', 'items'],
    get: (email, preferredChannel, phone, items) => {
      const emailText = String(email ?? '').trim()
      const emailValid = emailText !== '' && emailText.includes('@')
      const phoneRequired = preferredChannel === 'phone' && String(phone ?? '').trim() === ''
      return emailValid && !phoneRequired && !hasInvalidItem(items)
    },
  }),

  // 字段级错误提示（用于 UI 展示）
  'errors.email': FieldContracts.fieldComputed({
    deps: ['contact.email'],
    get: (email) => {
      const text = String(email ?? '').trim()
      if (text === '') return '请填写邮箱'
      if (!text.includes('@')) return '邮箱格式不正确'
      return null
    },
  }),
  'errors.phone': FieldContracts.fieldComputed({
    deps: ['contact.preferredChannel', 'contact.phone'],
    get: (preferredChannel, phone) => {
      const phoneRequired = preferredChannel === 'phone' && String(phone ?? '').trim() === ''
      if (phoneRequired) return '当首选渠道为电话时，手机号必填'
      return null
    },
  }),
  'errors.items': FieldContracts.fieldComputed({
    deps: ['items'],
    get: (items) => {
      const list = toItemList(items)
      if (list.length === 0) return '至少需要一行商品'
      if (hasInvalidItem(items)) return '请检查商品名称、数量和价格'
      return null
    },
  }),

  // 汇总字段
  'summary.itemCount': FieldContracts.fieldComputed({
    deps: ['items'],
    get: (items) => (Array.isArray(items) ? items.length : 0),
  }),
  'summary.totalQuantity': FieldContracts.fieldComputed({
    deps: ['items'],
    get: totalQuantityOf,
  }),
  'summary.totalAmount': FieldContracts.fieldComputed({
    deps: ['items'],
    get: totalAmountOf,
  }),
  'summary.hasInvalid': FieldContracts.fieldComputed({
    deps: ['contact.email', 'contact.preferredChannel', 'contact.phone', 'items'],
    get: (email, preferredChannel, phone, items) => {
      const emailText = String(email ?? '').trim()
      const emailValid = emailText !== '' && emailText.includes('@')
      const phoneRequired = preferredChannel === 'phone' && String(phone ?? '').trim() === ''
      return !emailValid || phoneRequired || hasInvalidItem(items)
    },
  }),
})

export const ComplexFieldForm = Logix.Module.make('ComplexFieldFormModule', {
  state: ComplexFieldFormStateSchema,
  actions: ComplexFieldFormActions,
})

const ComplexFieldFormFieldsLogic = ComplexFieldForm.logic('complex-field-form-fields', ($) => {
  $.fields(ComplexFieldFormFields)
  return Effect.void
})

const ComplexFieldFormLogic = ComplexFieldForm.logic('complex-field-form-logic', ($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction('changeFirstName').mutate((state, action) => {
          state.profile.firstName = action.payload
        }),
        $.onAction('changeLastName').mutate((state, action) => {
          state.profile.lastName = action.payload
        }),
        $.onAction('changeEmail').mutate((state, action) => {
          state.contact.email = action.payload
        }),
        $.onAction('changePhone').mutate((state, action) => {
          state.contact.phone = action.payload
        }),
        $.onAction('changePreferredChannel').mutate((state, action) => {
          state.contact.preferredChannel = action.payload
        }),

        $.onAction('addItem').mutate((state) => {
          state.items.push(makeItem())
        }),
        $.onAction('removeItem').mutate((state, action) => {
          state.items = state.items.filter((item) => item.id !== action.payload)
        }),
        $.onAction('changeItemName').mutate((state, action) => {
          const target = state.items.find((item) => item.id === action.payload.id)
          if (target) {
            target.name = action.payload.name
          }
        }),
        $.onAction('changeItemQuantity').mutate((state, action) => {
          const target = state.items.find((item) => item.id === action.payload.id)
          if (target) {
            target.quantity = action.payload.quantity
          }
        }),
        $.onAction('changeItemPrice').mutate((state, action) => {
          const target = state.items.find((item) => item.id === action.payload.id)
          if (target) {
            target.price = action.payload.price
          }
        }),
        // submit：读取当前校验结果，写入提交状态，供 UI 展示。
        $.onAction('submit').mutate((state) => {
          const ok = state.validation.formValid
          state.submit.attempted = true
          state.submit.result = ok ? 'success' : 'error'
        }),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

export const ComplexFieldFormProgram = Logix.Program.make(ComplexFieldForm, {
  initial: {
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
    items: [makeItem()],
    summary: {
      itemCount: 1,
      totalQuantity: 1,
      totalAmount: 0,
      hasInvalid: true,
    },
    validation: {
      emailValid: false,
      phoneRequired: false,
      formValid: false,
    },
    errors: {
      email: '请填写邮箱',
      phone: null,
      items: '至少需要一行商品',
    },
    submit: {
      attempted: false,
      result: 'idle',
    },
  },
  logics: [ComplexFieldFormFieldsLogic, ComplexFieldFormLogic],
})
