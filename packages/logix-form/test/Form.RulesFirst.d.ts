import type * as Form from '../src/index.js'
import type { RulesDsl, RulesSpec } from '../src/dsl/rules.js'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Assert<T extends true> = T

type IsAny<T> = 0 extends 1 & T ? true : false

type Values = {
  contact: {
    email: string
    preferredChannel: 'email' | 'phone'
    phone: string
  }
  profile: {
    security: {
      password: string
      confirmPassword: string
    }
  }
  items: ReadonlyArray<{
    id: string
    warehouseId: string
    quantity: number
    price: number
  }>
}

type Item = Values['items'][number]

type _CheckListIdentity = Assert<
  Equals<
    Form.Rule.ListIdentityPolicy,
    | Readonly<{ readonly mode: 'trackBy'; readonly trackBy: string }>
    | Readonly<{ readonly mode: 'store' }>
    | Readonly<{ readonly mode: 'index' }>
  >
>

type _CheckRuleInputNotAny = Assert<IsAny<Form.Rule.RuleInput<string>> extends true ? false : true>

type _CheckRuleInputIncludesRuleGroup = Assert<
  Form.Rule.RuleGroup<string> extends Form.Rule.RuleInput<string> ? true : false
>

type _RulesDslCallArgs = RulesDsl<Values> extends (...args: infer A) => any ? A : never
type _RulesDslCallReturn = RulesDsl<Values> extends (...args: any) => infer R ? R : never

type _CheckRulesDslNotAny = Assert<IsAny<RulesDsl<Values>> extends true ? false : true>

type _CheckRulesDslReturn = Assert<Equals<_RulesDslCallReturn, RulesSpec<Values>>>

type DeclOrDeclList = Form.Rule.RulesDecl<Values> | ReadonlyArray<Form.Rule.RulesDecl<Values>>

type _CheckRulesDslArgs = Assert<Equals<_RulesDslCallArgs, ReadonlyArray<DeclOrDeclList>>>

type _CheckSchemaReturn = Assert<Equals<ReturnType<RulesDsl<Values>['schema']>, RulesSpec<Values>>>

type _CheckAtReturn = Assert<Equals<ReturnType<RulesDsl<Values>['at']>, RulesDsl<Values>>>

type _CheckArrayIdentityParam = Assert<
  Equals<Parameters<RulesDsl<Values>['array']>[1]['identity'], Form.Rule.ListIdentityPolicy>
>

type _CheckListDeclItem = Assert<Equals<Form.Rule.ListDecl<Item>['identity'], Form.Rule.ListIdentityPolicy>>
