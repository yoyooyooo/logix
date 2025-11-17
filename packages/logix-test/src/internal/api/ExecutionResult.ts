import { Chunk } from 'effect'
import type * as Logix from '@logix/core'

export interface ExecutionResult<Sh extends Logix.AnyModuleShape> {
  readonly trace: ReadonlyArray<TraceEvent<Sh>>
  readonly state: Logix.StateOf<Sh>
  readonly actions: ReadonlyArray<Logix.ActionOf<Sh>>
}

export type TraceEvent<Sh extends Logix.AnyModuleShape> =
  | { _tag: 'Action'; action: Logix.ActionOf<Sh>; timestamp: number }
  | { _tag: 'State'; state: Logix.StateOf<Sh>; timestamp: number }
  | { _tag: 'Error'; cause: unknown; timestamp: number }

export const make = <Sh extends Logix.AnyModuleShape>(
  state: Logix.StateOf<Sh>,
  actions: ReadonlyArray<Logix.ActionOf<Sh>>,
  trace: ReadonlyArray<TraceEvent<Sh>>,
): ExecutionResult<Sh> => ({
  state,
  actions,
  trace,
})

// ---------------------------------------------------------------------------
// Helper utilities for common assertions on ExecutionResult
// ---------------------------------------------------------------------------

export const hasAction = <Sh extends Logix.AnyModuleShape>(
  result: ExecutionResult<Sh>,
  predicate: (action: Logix.ActionOf<Sh>) => boolean,
): boolean => result.actions.some(predicate)

export const getActionsByTag = <Sh extends Logix.AnyModuleShape>(
  result: ExecutionResult<Sh>,
  tag: string,
): ReadonlyArray<Logix.ActionOf<Sh>> =>
  result.actions.filter((action) => typeof (action as any)._tag === 'string' && (action as any)._tag === tag)

export const hasError = <Sh extends Logix.AnyModuleShape>(result: ExecutionResult<Sh>): boolean =>
  result.trace.some((event) => event._tag === 'Error')

export const getErrors = <Sh extends Logix.AnyModuleShape>(
  result: ExecutionResult<Sh>,
): ReadonlyArray<Extract<TraceEvent<Sh>, { _tag: 'Error' }>> =>
  result.trace.filter((event): event is Extract<TraceEvent<Sh>, { _tag: 'Error' }> => event._tag === 'Error')

const actionTagOf = (action: Logix.ActionOf<Logix.AnyModuleShape>): string | undefined => {
  const value = action as any
  if (typeof value?._tag === 'string') {
    return value._tag
  }
  if (typeof value?.type === 'string') {
    return value.type
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Assertion-style helpers (throwing on failure)
// ---------------------------------------------------------------------------

export const expectActionTag = <Sh extends Logix.AnyModuleShape>(
  result: ExecutionResult<Sh>,
  tag: string,
  options: { readonly times?: number } = {},
): void => {
  const actions = getActionsByTag(result, tag)
  if (actions.length === 0) {
    throw new Error(`Expected at least one action with tag "${tag}", but found none.`)
  }
  if (options.times !== undefined && actions.length !== options.times) {
    throw new Error(`Expected ${options.times} actions with tag "${tag}", but found ${actions.length}.`)
  }
}

export const expectNoActionTag = <Sh extends Logix.AnyModuleShape>(result: ExecutionResult<Sh>, tag: string): void => {
  const actions = getActionsByTag(result, tag)
  if (actions.length > 0) {
    throw new Error(`Expected no actions with tag "${tag}", but found ${actions.length}.`)
  }
}

export const expectActionSequence = <Sh extends Logix.AnyModuleShape>(
  result: ExecutionResult<Sh>,
  tags: ReadonlyArray<string>,
): void => {
  const actualTags = result.actions
    .map((action) => actionTagOf(action))
    .filter((tag): tag is string => typeof tag === 'string')

  if (actualTags.length !== tags.length) {
    throw new Error(`Expected action tag sequence [${tags.join(', ')}], but got [${actualTags.join(', ')}].`)
  }

  for (let i = 0; i < tags.length; i++) {
    if (actualTags[i] !== tags[i]) {
      throw new Error(`Expected action tag sequence [${tags.join(', ')}], but got [${actualTags.join(', ')}].`)
    }
  }
}

export const expectNoError = <Sh extends Logix.AnyModuleShape>(result: ExecutionResult<Sh>): void => {
  const errors = getErrors(result)
  if (errors.length > 0) {
    throw new Error(`Expected no errors, but found ${errors.length}. First error cause: ${String(errors[0]?.cause)}`)
  }
}
