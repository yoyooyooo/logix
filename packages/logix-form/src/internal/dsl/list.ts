import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import type { NodeSpec } from './fields.js'

export type List<Item = unknown> = FieldContracts.FieldList<Item>

export type ListSpec<Item = unknown> = Omit<FieldContracts.FieldList<Item>, '_tag' | 'item' | 'list'> & {
  readonly item?: NodeSpec<Item, any> | FieldContracts.FieldNode<Item, any>
  readonly list?: NodeSpec<ReadonlyArray<Item>, any> | FieldContracts.FieldNode<ReadonlyArray<Item>, any>
}

export const list = <Item = unknown>(spec: ListSpec<Item>): FieldContracts.FieldList<Item> =>
  FieldContracts.fieldList(spec as any)
