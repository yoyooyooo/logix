import { StateTrait, Module } from '@logix/core'
import { Effect, Schema } from 'effect'

// 复杂表单场景：
// - profile + contact + shipping 三块基础信息；
// - items 动态列表（订单行）；
// - summary / validation 完全由 StateTrait.computed 维护；
// - shipping.* 通过 StateTrait.link 从 profile / contact 联动。

export const ComplexTraitFormStateSchema = Schema.Struct({
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
  // UI 侧辅助字段：由 Traits + Logic 一起驱动，用于错误提示与提交流程状态。
  errors: Schema.Struct({
    email: Schema.Union(Schema.String, Schema.Null),
    phone: Schema.Union(Schema.String, Schema.Null),
    items: Schema.Union(Schema.String, Schema.Null),
  }),
  submit: Schema.Struct({
    attempted: Schema.Boolean,
    result: Schema.Literal('idle', 'success', 'error'),
  }),
})

export type ComplexTraitFormState = Schema.Schema.Type<typeof ComplexTraitFormStateSchema>

export const ComplexTraitFormActions = {
  changeFirstName: Schema.String,
  changeLastName: Schema.String,
  changeEmail: Schema.String,
  changePhone: Schema.String,
  changePreferredChannel: Schema.Literal('email', 'phone'),

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

// Traits：计算字段 + 联动字段 + 校验与汇总
export const ComplexTraitFormTraits = StateTrait.from(ComplexTraitFormStateSchema)({
  // profile.fullName 由 firstName / lastName 推导
  'profile.fullName': StateTrait.computed((s) => {
    const full = `${s.profile.firstName} ${s.profile.lastName}`.trim()
    return full
  }),

  // shipping.* 跟随 profile / contact 联动
  'shipping.recipientName': StateTrait.link({
    from: 'profile.fullName',
  }),
  'shipping.contactEmail': StateTrait.link({
    from: 'contact.email',
  }),

  // 验证字段
  'validation.emailValid': StateTrait.computed((s) => {
    const email = s.contact.email.trim()
    // 这里只做一个非常宽松的校验，用于演示 Trait 行为
    return email === '' ? false : email.includes('@')
  }),
  'validation.phoneRequired': StateTrait.computed((s) => {
    return s.contact.preferredChannel === 'phone' && s.contact.phone.trim() === ''
  }),
  'validation.formValid': StateTrait.computed((s) => {
    const emailValid = s.contact.email.trim() !== '' && s.contact.email.includes('@')
    const phoneRequired = s.contact.preferredChannel === 'phone' && s.contact.phone.trim() === ''
    const hasBadItem =
      s.items.length === 0 ||
      s.items.some((item) => item.name.trim() === '' || item.quantity <= 0 || item.price < 0)
    return emailValid && !phoneRequired && !hasBadItem
  }),

  // 字段级错误提示（用于 UI 展示）
  'errors.email': StateTrait.computed((s) => {
    const email = s.contact.email.trim()
    if (email === '') return '请填写邮箱'
    if (!email.includes('@')) return '邮箱格式不正确'
    return null
  }),
  'errors.phone': StateTrait.computed((s) => {
    const phoneRequired = s.contact.preferredChannel === 'phone' && s.contact.phone.trim() === ''
    if (phoneRequired) return '当首选渠道为电话时，手机号必填'
    return null
  }),
  'errors.items': StateTrait.computed((s) => {
    if (s.items.length === 0) return '至少需要一行商品'
    const hasBadItem = s.items.some(
      (item) => item.name.trim() === '' || item.quantity <= 0 || item.price < 0,
    )
    if (hasBadItem) return '请检查商品名称、数量和价格'
    return null
  }),

  // 汇总字段
  'summary.itemCount': StateTrait.computed((s) => s.items.length),
  'summary.totalQuantity': StateTrait.computed((s) =>
    s.items.reduce((acc, item) => acc + item.quantity, 0),
  ),
  'summary.totalAmount': StateTrait.computed((s) =>
    s.items.reduce((acc, item) => acc + item.quantity * item.price, 0),
  ),
  'summary.hasInvalid': StateTrait.computed((s) => {
    const hasBadItem =
      s.items.length === 0 ||
      s.items.some((item) => item.name.trim() === '' || item.quantity <= 0 || item.price < 0)
    const emailValid = s.contact.email.trim() !== '' && s.contact.email.includes('@')
    const phoneRequired = s.contact.preferredChannel === 'phone' && s.contact.phone.trim() === ''
    return !emailValid || phoneRequired || hasBadItem
  }),
})

export const ComplexTraitFormModule = Module.make('ComplexTraitFormModule', {
  state: ComplexTraitFormStateSchema,
  actions: ComplexTraitFormActions,
  traits: ComplexTraitFormTraits,
})

const ComplexTraitFormLogic = ComplexTraitFormModule.logic(($) =>
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

export const ComplexTraitFormImpl = ComplexTraitFormModule.implement({
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
  logics: [ComplexTraitFormLogic],
})
