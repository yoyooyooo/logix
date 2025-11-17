import * as Logix from '@logix/core'
import type { NodeSpec } from './traits.js'

export type List<Item = unknown> = Logix.StateTrait.StateTraitList<Item>

export type ListSpec<Item = unknown> = Omit<Logix.StateTrait.StateTraitList<Item>, '_tag' | 'item' | 'list'> & {
  readonly item?: NodeSpec<Item, any> | Logix.StateTrait.StateTraitNode<Item, any>
  readonly list?: NodeSpec<ReadonlyArray<Item>, any> | Logix.StateTrait.StateTraitNode<ReadonlyArray<Item>, any>
}

export const list = <Item = unknown>(spec: ListSpec<Item>): Logix.StateTrait.StateTraitList<Item> =>
  Logix.StateTrait.list(spec as any)
