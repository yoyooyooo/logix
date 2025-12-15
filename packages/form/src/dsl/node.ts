import * as Logix from "@logix/core"

export type Node<Input = unknown, Ctx = unknown> = Logix.StateTrait.StateTraitNode<Input, Ctx>
export type CheckRule<Input = unknown, Ctx = unknown> = Logix.StateTrait.CheckRule<Input, Ctx>

export const node = <Input = unknown, Ctx = unknown>(
  spec: Omit<Logix.StateTrait.StateTraitNode<Input, Ctx>, "_tag">,
): Logix.StateTrait.StateTraitNode<Input, Ctx> => Logix.StateTrait.node(spec)

