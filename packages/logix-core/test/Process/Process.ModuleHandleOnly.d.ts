import type * as Logix from '../../src/index.js'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Assert<T extends true> = T

type Handle = Logix.ModuleHandle<Logix.AnyModuleShape>
type Keys = keyof Handle

type _HasRead = Assert<Equals<'read' extends Keys ? true : false, true>>
type _HasChanges = Assert<Equals<'changes' extends Keys ? true : false, true>>
type _HasDispatch = Assert<Equals<'dispatch' extends Keys ? true : false, true>>
type _HasActions = Assert<Equals<'actions' extends Keys ? true : false, true>>
type _HasActions$ = Assert<Equals<'actions$' extends Keys ? true : false, true>>

type _NoSetState = Assert<Equals<'setState' extends Keys ? true : false, false>>
type _NoStateRef = Assert<Equals<'stateRef' extends Keys ? true : false, false>>
