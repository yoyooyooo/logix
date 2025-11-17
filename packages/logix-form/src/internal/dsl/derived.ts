import type { Schema } from 'effect'
import type { DerivedSpec } from '../../Trait.js'

/**
 * Form.derived：
 * - Provides "type narrowing based on the values schema" for derived specs, so you can compose derived fragments
 *   without losing type information.
 * - Does no extra runtime normalization; final validation is still governed by Form.make guardrails.
 */
export const derived = <TValues extends object, I>(_valuesSchema: Schema.Schema<TValues, I>) => {
  function run(spec: DerivedSpec<TValues>): DerivedSpec<TValues>
  function run(spec: any): any {
    return spec
  }

  return run
}
