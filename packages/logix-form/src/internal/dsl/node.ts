import * as Logix from '@logix/core'
import type { RuleEntry } from '../../Rule.js'

export type Node<Input = unknown, Ctx = unknown> = Logix.StateTrait.StateTraitNode<Input, Ctx>
export type CheckRule<Input = unknown, Ctx = unknown> = RuleEntry<Input, Ctx>

export type NodeSpec<Input = unknown, Ctx = unknown> = Omit<
  Logix.StateTrait.StateTraitNode<Input, Ctx>,
  '_tag' | 'check'
> & {
  readonly check?: Readonly<Record<string, RuleEntry<Input, Ctx>>>
}

export const node = <Input = unknown, Ctx = unknown>(
  spec: NodeSpec<Input, Ctx>,
): Logix.StateTrait.StateTraitNode<Input, Ctx> => Logix.StateTrait.node(spec as any)
