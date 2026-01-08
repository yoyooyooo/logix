import { Schema } from 'effect'
import * as Form from '@logixjs/form'

// Rules 可组合性示例（Node DSL only）：
// - 用 `z.object/z.array/z.field(...)` 写结构化规则树
// - 用 `z.schema(node)` 编译成 decl list（FormRulesSpec）
// - 用 `z.at(prefix)` 把“子树规则”挂到指定前缀下，并以 `spec.decls` 形式组合

const ItemSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  quantity: Schema.Number,
  price: Schema.Number,
})

export const RulesCompositionNodeValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    security: Schema.Struct({
      password: Schema.String,
      confirmPassword: Schema.String,
    }),
  }),
  contact: Schema.Struct({
    email: Schema.String,
    preferredChannel: Schema.Literal('email', 'phone'),
    phone: Schema.String,
  }),
  items: Schema.Array(ItemSchema),
})

export type RulesCompositionNodeValues = Schema.Schema.Type<typeof RulesCompositionNodeValuesSchema>
export type Item = Schema.Schema.Type<typeof ItemSchema>

const $ = Form.from(RulesCompositionNodeValuesSchema)
const z = $.rules

// ---------------------------------------------------------------------------
// 1) profile 子树：`z.at("profile")` + nested object refine（$self）
// ---------------------------------------------------------------------------

const zp = z.at('profile')
const profileSpec = zp.schema(
  zp.object({
    firstName: zp.field({ required: '名必填' }),
    lastName: zp.field({ required: '姓必填' }),
    security: zp
      .object({
        password: zp.field({ minLength: { min: 8, message: '密码至少 8 位' } }),
        confirmPassword: zp.field({ required: '请再次输入密码' }),
      })
      .refine({
        deps: ['password', 'confirmPassword'],
        validate: (security: RulesCompositionNodeValues['profile']['security']) =>
          String(security?.password ?? '') === String(security?.confirmPassword ?? '') ? undefined : '两次密码不一致',
      }),
  }),
)

// ---------------------------------------------------------------------------
// 2) contact 子树：`z.at("contact")` + field deps + object refine（$self）
// ---------------------------------------------------------------------------

const zc = z.at('contact')
const contactSpec = zc.schema(
  zc
    .object({
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
          const state = (ctx as any).state as RulesCompositionNodeValues
          if (state.contact.preferredChannel !== 'phone') return undefined
          return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，手机号必填'
        },
      }),
    })
    .refine({
      deps: ['preferredChannel', 'phone'],
      validate: (contact: RulesCompositionNodeValues['contact']) => {
        if (contact.preferredChannel !== 'phone') return undefined
        return String(contact.phone ?? '').trim() ? undefined : '选择电话时手机号必填'
      },
    }),
)

// ---------------------------------------------------------------------------
// 3) items 子树：`z.at("items")` + array(item) + list refine
// ---------------------------------------------------------------------------

const zi = z.at('items')
const itemsSpec = zi.schema(
  zi
    .array(
      zi.object({
        id: zi.field({}),
        name: zi.field({ required: '名称必填' }),
        quantity: zi.field({ min: { min: 1, message: '数量必须 > 0' } }),
        price: zi.field({ min: { min: 0, message: '价格不能为负' } }),
      }),
      { identity: { mode: 'trackBy', trackBy: 'id' } },
    )
    .refine({
      validate: (rows: ReadonlyArray<Item>) => (rows.length > 0 ? undefined : { $list: '至少一行' }),
    }),
)

export const RulesCompositionNodeForm = Form.make('FormRulesComposition.Node', {
  values: RulesCompositionNodeValuesSchema,
  initialValues: {
    profile: { firstName: '', lastName: '', security: { password: '', confirmPassword: '' } },
    contact: { email: '', preferredChannel: 'email', phone: '' },
    items: [],
  },
  validateOn: ['onSubmit'],
  reValidateOn: ['onChange'],
  rules: z(profileSpec.decls, contactSpec.decls, itemsSpec.decls),
})
