import type * as Logix from '../../src/index.js'

// Type-level helpers: compare two types for equality and assert.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Assert<T extends true> = T

type State = {
  a: number
  b: number
  sum: number
  profile: {
    id: string
    name: string
  }
  profileResource: Logix.Resource.ResourceSnapshot<{ name: string }, unknown>
}

type Paths = Logix.StateTrait.StateFieldPath<State>

type ExpectedPaths =
  | 'a'
  | 'b'
  | 'sum'
  | 'profile'
  | 'profile.id'
  | 'profile.name'
  | 'profileResource'
  | 'profileResource.status'
  | 'profileResource.keyHash'
  | 'profileResource.data'
  | 'profileResource.data.name'
  | 'profileResource.error'

// Paths must be exactly equal to ExpectedPaths (bidirectional constraint).
type _CheckPaths = Assert<Equals<Paths, ExpectedPaths>>

// StateAtPath should infer the field type from a path.
type _CheckAtRoot = Assert<Equals<Logix.StateTrait.StateAtPath<State, 'profile'>, { id: string; name: string }>>

type _CheckAtNested = Assert<Equals<Logix.StateTrait.StateAtPath<State, 'profile.name'>, string>>

type _CheckAtLeaf = Assert<Equals<Logix.StateTrait.StateAtPath<State, 'sum'>, number>>

type _CheckResourceStatus = Assert<
  Equals<Logix.StateTrait.StateAtPath<State, 'profileResource.status'>, Logix.Resource.ResourceStatus>
>

type _CheckResourceName = Assert<Equals<Logix.StateTrait.StateAtPath<State, 'profileResource.data.name'>, string>>

// Non-existent paths should infer to never, used to trigger type errors in follow-up tests.
type _CheckInvalidPath = Assert<Equals<Logix.StateTrait.StateAtPath<State, 'profile.age'>, never>>
