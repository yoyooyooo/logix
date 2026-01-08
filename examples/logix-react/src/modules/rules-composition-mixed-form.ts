import { Schema } from 'effect'
import * as Form from '@logixjs/form'

// Rules 可组合性示例（Mixed：Node DSL + Decl DSL）：
// - Node DSL：适合“结构化写一棵子树”（配合 z.at(prefix)）
// - Decl DSL：适合“按路径挂规则”，以及 list 的 row-level（item.validate(row)）表达力
// - 组合方式：把 Node DSL 的 `spec.decls` 与 Decl DSL 的 decls 一起丢给 `z(...)`

const ItemSchema = Schema.Struct({
  id: Schema.String,
  sku: Schema.String,
  quantity: Schema.Number,
  price: Schema.Number,
  discount: Schema.Number,
})

export const RulesCompositionMixedValuesSchema = Schema.Struct({
  contact: Schema.Struct({
    email: Schema.String,
    preferredChannel: Schema.Literal('email', 'phone'),
    phone: Schema.String,
  }),
  items: Schema.Array(ItemSchema),
  note: Schema.String,
})

export type RulesCompositionMixedValues = Schema.Schema.Type<typeof RulesCompositionMixedValuesSchema>
export type Item = Schema.Schema.Type<typeof ItemSchema>

const $ = Form.from(RulesCompositionMixedValuesSchema)
const z = $.rules

type Z = typeof z

// ---------------------------------------------------------------------------
// 1) Node DSL：contact 子树（用 z.at("contact") 避免重复 prefix）
// ---------------------------------------------------------------------------

const zc = z.at('contact')
const contactSpec = zc.schema(
  zc.object({
    email: zc.field({
      required: '邮箱必填',
      validate: {
        format: (email: string) => (String(email ?? '').includes('@') ? undefined : '邮箱格式不正确'),
      },
    }),
    preferredChannel: zc.field({}),
    phone: zc.field({
      deps: ['preferredChannel'],
      validate: (phone: string, ctx: unknown) => {
        const state = (ctx as any).state as RulesCompositionMixedValues
        if (state.contact.preferredChannel !== 'phone') return undefined
        return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，手机号必填'
      },
    }),
  }),
)

// ---------------------------------------------------------------------------
// 2) Decl DSL：items list（row-level 表达力更强：item.validate(row)）
// ---------------------------------------------------------------------------

const itemsRules = (z: Z) =>
  [
    z.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
      item: {
        deps: ['sku', 'quantity', 'price', 'discount'],
        validate: (row: Item) => {
          const errors: Record<string, unknown> = {}
          if (!String(row?.sku ?? '').trim()) errors.sku = 'SKU 必填'
          if (!(typeof row.quantity === 'number') || row.quantity <= 0) errors.quantity = '数量需 > 0'
          if (!(typeof row.price === 'number') || row.price < 0) errors.price = '价格需 ≥ 0'
          if (!(typeof row.discount === 'number') || row.discount < 0 || row.discount > 1) {
            errors.discount = '折扣需在 [0,1] 内'
          }

          // row-level 约束（Node DSL 的 array(item) 暂时不擅长表达这种跨字段关系）
          const total = row.quantity * row.price * (1 - row.discount)
          if (Number.isFinite(total) && total <= 0) {
            errors.price = '折后金额需 > 0'
          }

          return Object.keys(errors).length ? errors : undefined
        },
      },
      list: {
        validate: (rows: ReadonlyArray<Item>) => (rows.length > 0 ? undefined : { $list: '至少一行' }),
      },
    }),
  ] as const

// ---------------------------------------------------------------------------
// 3) Decl DSL：零散字段/根规则（作为 add-on 组合）
// ---------------------------------------------------------------------------

const noteRules = (z: Z) =>
  [
    z.field('note', {
      maxLength: { max: 200, message: '备注最多 200 字' },
    }),
  ] as const

const rootRules = (z: Z) =>
  [
    z.root({
      deps: ['items'],
      validate: (values: RulesCompositionMixedValues) => (values.items.length > 0 ? undefined : '请至少添加一行'),
    }),
  ] as const

export const RulesCompositionMixedForm = Form.make('FormRulesComposition.Mixed', {
  values: RulesCompositionMixedValuesSchema,
  initialValues: {
    contact: { email: '', preferredChannel: 'email', phone: '' },
    items: [],
    note: '',
  },
  validateOn: ['onSubmit'],
  reValidateOn: ['onChange'],
  rules: z(contactSpec.decls, itemsRules(z), noteRules(z), rootRules(z)),
})
