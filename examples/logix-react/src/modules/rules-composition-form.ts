import { Schema } from 'effect'
import * as Form from '@logixjs/form'

// Rules 可组合性示例（Decl DSL only）：
// - 把 rules 拆成多个“规则片段”（按领域/子模块划分）
// - 最终通过 `z(fragment1, fragment2, ...)` 合并成一个 FormRulesSpec
// - 同一路径重复声明会稳定失败；若要“叠加校验”，应组合到同一个 ruleInput 的 validate 里

export const LineItemSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  quantity: Schema.Number,
  price: Schema.Number,
})

export const RulesCompositionValuesSchema = Schema.Struct({
  contact: Schema.Struct({
    email: Schema.String,
    preferredChannel: Schema.Literal('email', 'phone'),
    phone: Schema.String,
  }),
  items: Schema.Array(LineItemSchema),
  note: Schema.String,
})

export type RulesCompositionValues = Schema.Schema.Type<typeof RulesCompositionValuesSchema>
export type LineItem = Schema.Schema.Type<typeof LineItemSchema>

const $ = Form.from(RulesCompositionValuesSchema)
const z = $.rules

type Z = typeof z

// ---------------------------------------------------------------------------
// 1) 规则片段：contact（字段规则 + 对象级 $self 规则）
// ---------------------------------------------------------------------------

const EmailRule = {
  required: '邮箱必填',
  validate: {
    format: (email: string) => (String(email ?? '').includes('@') ? undefined : '邮箱格式不正确'),
  },
} as const

const PhoneRule = {
  deps: ['preferredChannel'],
  validate: (phone: string, ctx: unknown) => {
    const state = (ctx as any).state as RulesCompositionValues
    if (state.contact.preferredChannel !== 'phone') return undefined
    return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，手机号必填'
  },
} as const

const contactRules = (z: Z) =>
  [
    z.field('contact.email', EmailRule),
    z.field('contact.phone', PhoneRule),

    // 对象级规则：deps 会提示为 contact 下的 key（不需要写全路径）
    z.field(
      'contact',
      {
        deps: ['email', 'preferredChannel', 'phone'],
        validate: (contact: RulesCompositionValues['contact']) => {
          if (contact.preferredChannel === 'phone') {
            return String(contact.phone ?? '').trim() ? undefined : '选择电话时手机号必填'
          }
          return undefined
        },
      },
      { errorTarget: '$self' },
    ),
  ] as const

// ---------------------------------------------------------------------------
// 2) 规则片段：items（list + item/list scope）
// ---------------------------------------------------------------------------

const lineItemRuleInput = {
  deps: ['name', 'quantity', 'price'],
  validate: (row: LineItem) => {
    const errors: Record<string, unknown> = {}
    if (!String(row?.name ?? '').trim()) errors.name = '名称必填'
    if (!(typeof row.quantity === 'number') || row.quantity <= 0) errors.quantity = '数量需 > 0'
    if (!(typeof row.price === 'number') || row.price < 0) errors.price = '价格需 ≥ 0'
    return Object.keys(errors).length ? errors : undefined
  },
} as const

const lineItemsListRuleInput = {
  validate: (rows: ReadonlyArray<LineItem>) =>
    Array.isArray(rows) && rows.length > 0 ? undefined : { $list: '至少一行' },
} as const

const itemsRules = (z: Z) =>
  [
    z.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
      item: lineItemRuleInput,
      list: lineItemsListRuleInput,
    }),
  ] as const

// ---------------------------------------------------------------------------
// 3) 规则片段：root（整表单兜底）
// ---------------------------------------------------------------------------

const rootRules = (z: Z) =>
  [
    z.root({
      deps: ['items'],
      validate: (values: RulesCompositionValues) => (values.items.length > 0 ? undefined : '请至少添加一行'),
    }),
  ] as const

// ---------------------------------------------------------------------------
// 4) 合并：z(...) 支持直接传入“数组片段”
// ---------------------------------------------------------------------------

export const RulesCompositionForm = Form.make('FormRulesComposition', {
  values: RulesCompositionValuesSchema,
  initialValues: {
    contact: { email: '', preferredChannel: 'email', phone: '' },
    items: [],
    note: '',
  },
  validateOn: ['onSubmit'],
  reValidateOn: ['onChange'],
  rules: z(contactRules(z), itemsRules(z), rootRules(z)),
})
