import type { Schema } from 'effect'
import type * as Logix from '@logixjs/core'
import type { DerivedSpec } from '../../Trait.js'
import { derived } from './derived.js'
import { rules } from './rules.js'
import type { RulesDsl } from './rules.js'
import { traits } from './traits.js'
import type { TraitsSpec } from './traits.js'

export type FormFrom<TValues extends object> = Readonly<{
  readonly derived: (spec: DerivedSpec<TValues>) => DerivedSpec<TValues>
  readonly rules: RulesDsl<TValues>
  readonly traits: {
    (spec: TraitsSpec<TValues>): Logix.StateTrait.StateTraitSpec<TValues>
    (spec: Logix.StateTrait.StateTraitSpec<TValues>): Logix.StateTrait.StateTraitSpec<TValues>
  }
}>

export const fromValues = <TValues extends object>(valuesSchema: Schema.Schema<TValues>): FormFrom<TValues> => ({
  derived: derived(valuesSchema),
  rules: rules(valuesSchema),
  traits: traits(valuesSchema),
})
