import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import type { RuleEntry } from '../../Rule.js'

export type Node<Input = unknown, Ctx = unknown> = FieldContracts.FieldNode<Input, Ctx>
export type CheckRule<Input = unknown, Ctx = unknown> = RuleEntry<Input, Ctx>

export type NodeSpec<Input = unknown, Ctx = unknown> = Omit<
  FieldContracts.FieldNode<Input, Ctx>,
  '_tag' | 'check'
> & {
  readonly check?: Readonly<Record<string, RuleEntry<Input, Ctx>>>
}

export const node = <Input = unknown, Ctx = unknown>(
  spec: NodeSpec<Input, Ctx>,
): FieldContracts.FieldNode<Input, Ctx> => FieldContracts.fieldNode(spec as any)
