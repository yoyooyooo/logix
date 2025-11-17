import type * as Form from '../src/index.js'

// Type helper: check whether two types are equal & assert.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Assert<T extends true> = T

type Values = {
  name: string
  profile: {
    id: string
    address: {
      city: string
    }
  }
  items: ReadonlyArray<{
    warehouseId: string
    meta: {
      tags: ReadonlyArray<{
        code: number
      }>
    }
  }>
}

type Paths = Form.FieldPath<Values>

type ExpectedPaths =
  | 'name'
  | 'profile'
  | 'profile.id'
  | 'profile.address'
  | 'profile.address.city'
  | 'items'
  | `items.${number}`
  | `items.${number}.warehouseId`
  | `items.${number}.meta`
  | `items.${number}.meta.tags`
  | `items.${number}.meta.tags.${number}`
  | `items.${number}.meta.tags.${number}.code`

// `Paths` must strictly equal `ExpectedPaths` (bidirectional constraint).
type _CheckPaths = Assert<Equals<Paths, ExpectedPaths>>

type Item = {
  warehouseId: string
  meta: { tags: ReadonlyArray<{ code: number }> }
}

type _CheckAtRoot = Assert<Equals<Form.FieldValue<Values, 'profile'>, Values['profile']>>

type _CheckAtNested = Assert<Equals<Form.FieldValue<Values, 'profile.address.city'>, string>>

type _CheckAtArrayItem = Assert<Equals<Form.FieldValue<Values, `items.${number}`>, Item>>

type _CheckAtArrayLeaf = Assert<Equals<Form.FieldValue<Values, `items.${number}.warehouseId`>, string>>

type _CheckAtDeepArrayLeaf = Assert<Equals<Form.FieldValue<Values, `items.${number}.meta.tags.${number}.code`>, number>>
