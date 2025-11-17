import type { Schema } from 'effect'
import { derived } from './derived.js'
import { rules } from './rules.js'
import { traits } from './traits.js'

export type FormFrom<TValues extends object> = Readonly<{
  readonly derived: ReturnType<typeof derived<TValues, any>>
  readonly rules: ReturnType<typeof rules<TValues, any>>
  readonly traits: ReturnType<typeof traits<TValues, any>>
}>

export const fromValues = <TValues extends object, I>(valuesSchema: Schema.Schema<TValues, I>): FormFrom<TValues> => ({
  derived: derived(valuesSchema),
  rules: rules(valuesSchema),
  traits: traits(valuesSchema),
})
