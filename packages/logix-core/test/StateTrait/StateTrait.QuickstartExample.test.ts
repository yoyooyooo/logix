import { describe, it, expect } from '@effect/vitest'
import * as Logix from '../../src/index.js'
import {
  CounterWithProfile,
  CounterStateSchema,
  CounterTraits,
  type CounterState,
} from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('StateTrait quickstart example (CounterWithProfile)', () => {
  it('should define a module with state/actions/traits', () => {
    expect(CounterWithProfile.id).toBe('CounterWithProfile')
  })

  it('should expose typed traits spec for computed and link fields', () => {
    // sum: computed(a, b)
    const sumEntry = CounterTraits.sum as Logix.StateTrait.StateTraitEntry<CounterState, 'sum'>
    expect(sumEntry.kind).toBe('computed')

    const state: CounterState = {
      a: 1,
      b: 2,
      sum: 0,
      profile: { id: 'u1', name: 'Alice' },
      profileResource: Logix.Resource.Snapshot.success({
        keyHash: 'test',
        data: { name: 'Bob' },
      }),
    }

    if (sumEntry.kind !== 'computed') {
      throw new Error('expected computed entry for sum')
    }

    const nextSum = sumEntry.meta.derive(state)
    expect(nextSum).toEqual(3)

    // profile.name: link from profileResource.data.name
    const linkEntry = CounterTraits['profile.name'] as Logix.StateTrait.StateTraitEntry<CounterState, 'profile.name'>
    expect(linkEntry.kind).toBe('link')
    if (linkEntry.kind !== 'link') {
      throw new Error('expected link entry for profile.name')
    }
    expect(linkEntry.meta.from).toBe('profileResource.data.name')

    // Extra sanity check: StateFieldPath/StateAtPath are usable on this Schema.
    type Paths = Logix.StateTrait.StateFieldPath<CounterState>
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
