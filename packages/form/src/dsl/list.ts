import * as Logix from "@logix/core"

export type List<Item = unknown> = Logix.StateTrait.StateTraitList<Item>

export const list = <Item = unknown>(
  spec: Omit<Logix.StateTrait.StateTraitList<Item>, "_tag">,
): Logix.StateTrait.StateTraitList<Item> => Logix.StateTrait.list(spec)

