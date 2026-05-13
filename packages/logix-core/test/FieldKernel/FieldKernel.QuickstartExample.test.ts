import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '../../src/index.js'
import * as Resource from '../../src/Resource.js'
import {
  CounterWithProfile,
  CounterStateSchema,
  CounterFields,
  type CounterState,
} from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('FieldKernel quickstart example (CounterWithProfile)', () => {
  it('should define a module with state/actions/field declarations', () => {
    expect(CounterWithProfile.id).toBe('CounterWithProfile')
  })

  it('should expose typed field specs for computed and source-derived fields', () => {
    // sum: computed(a, b)
    const sumEntry = CounterFields.sum as FieldContracts.FieldEntry<CounterState, 'sum'>
    expect(sumEntry.kind).toBe('computed')

    const state: CounterState = {
      a: 1,
      b: 2,
      sum: 0,
      profile: { id: 'u1', name: 'Alice' },
      profileResource: Resource.Snapshot.success({
        keyHash: 'test',
        data: { name: 'Bob' },
      }),
    }

    if (sumEntry.kind !== 'computed') {
      throw new Error('expected computed entry for sum')
    }

    const nextSum = sumEntry.meta.derive(state)
    expect(nextSum).toEqual(3)

    // profile.name: computed from profileResource.data.name
    const profileNameEntry = CounterFields['profile.name'] as FieldContracts.FieldEntry<
      CounterState,
      'profile.name'
    >
    expect(profileNameEntry.kind).toBe('computed')
    if (profileNameEntry.kind !== 'computed') {
      throw new Error('expected computed entry for profile.name')
    }
    expect(profileNameEntry.meta.deps).toEqual(['profileResource.data.name'])
    expect(profileNameEntry.meta.derive(state)).toBe('Bob')

    // Extra sanity check: StateFieldPath/StateAtPath are usable on this Schema.
    type Paths = FieldContracts.StateFieldPath<CounterState>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _paths: Paths[] = [
      'a',
      'b',
      'sum',
      'profile',
      'profile.id',
      'profile.name',
      'profileResource',
      'profileResource.data',
      'profileResource.data.name',
    ]

    // No runtime behavior here; only validate type connectivity between DSL and Schema.
    expect(CounterStateSchema).toBeDefined()
  })
})
