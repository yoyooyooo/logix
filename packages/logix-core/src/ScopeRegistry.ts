import { Context, Layer, ManagedRuntime } from 'effect'
import { isDevEnv } from './Env.js'

export type ScopeId = string

type AnyTag = Context.Tag<any, any>

type LeaseId = number

type Entry = {
  readonly leaseId: LeaseId
  readonly value: unknown
}

export interface ScopeRegistry {
  /**
   * Registers a scope-bound value (multi-party registration supported; the last registration wins for get()).
   *
   * Returns a release function that revokes this registration.
   */
  readonly register: <A>(scopeId: ScopeId, token: Context.Tag<any, A>, value: A) => { readonly release: () => void }

  /**
   * Reads the current value for a token under a scope (the last registered value).
   */
  readonly get: <A>(scopeId: ScopeId, token: Context.Tag<any, A>) => A | undefined

  /**
   * Deletes all registrations of a token under a scope (regardless of who registered them).
   */
  readonly clearToken: (scopeId: ScopeId, token: AnyTag) => void

  /**
   * Clears all tokens under a scope.
   */
  readonly clearScope: (scopeId: ScopeId) => void

  /**
   * Clears the entire registry.
   */
  readonly clearAll: () => void
}

export class ScopeRegistryTag extends Context.Tag('@logixjs/core/ScopeRegistry')<ScopeRegistryTag, ScopeRegistry>() {}

/**
 * Stores a "ManagedRuntime handle for a scope" in ScopeRegistry.
 *
 * Typical use case: reusing the same runtime scope (Env/Scope/FiberRef) across React subtrees / independent roots
 * by registering the runtime under a scopeId and retrieving it elsewhere.
 */
export class ScopedRuntimeTag extends Context.Tag('@logixjs/core/ScopeRegistry/ScopedRuntime')<
  ScopedRuntimeTag,
  ManagedRuntime.ManagedRuntime<any, any>
>() {}

export const internal = {
  ScopeRegistryTag,
  ScopedRuntimeTag,
}

const makeRegistry = (): ScopeRegistry => {
  let nextLeaseId: LeaseId = 0

  // scopeId -> (token -> stack(entries))
  const scopes = new Map<ScopeId, Map<AnyTag, Array<Entry>>>()

  const getStack = (scopeId: ScopeId, token: AnyTag): Array<Entry> => {
    const byToken = scopes.get(scopeId)
    if (byToken) {
      const stack = byToken.get(token)
      if (stack) return stack
      const created: Array<Entry> = []
      byToken.set(token, created)
      return created
    }
    const created: Array<Entry> = []
    const createdByToken = new Map<AnyTag, Array<Entry>>()
    createdByToken.set(token, created)
    scopes.set(scopeId, createdByToken)
    return created
  }

  const tryDeleteEmpty = (scopeId: ScopeId, token: AnyTag): void => {
    const byToken = scopes.get(scopeId)
    if (!byToken) return
    const stack = byToken.get(token)
    if (stack && stack.length === 0) {
      byToken.delete(token)
    }
    if (byToken.size === 0) {
      scopes.delete(scopeId)
    }
  }

  const register: ScopeRegistry['register'] = (scopeId, token, value) => {
    nextLeaseId += 1
    const leaseId = nextLeaseId
    const stack = getStack(scopeId, token as AnyTag)

    // dev: multiple registrations for the same scopeId+token often indicate scopeId collisions or lifecycle leaks.
    // React / concurrent rendering / Provider rebuilds may cause short re-entrancy, so this is a soft warning.
    if (isDevEnv() && stack.length > 0) {
      // eslint-disable-next-line no-console
      console.debug(
        `[ScopeRegistry] Multiple registrations detected for scopeId="${scopeId}". ` +
          `This is allowed (LIFO), but usually indicates scopeId collisions or missing cleanup.`,
      )
    }

    stack.push({ leaseId, value })

    const release = () => {
      const stack2 = scopes.get(scopeId)?.get(token as AnyTag)
      if (!stack2 || stack2.length === 0) return

      // Common case: LIFO release
      const last = stack2[stack2.length - 1]
      if (last && last.leaseId === leaseId) {
        stack2.pop()
        tryDeleteEmpty(scopeId, token as AnyTag)
        return
      }

      // Fallback: releasing from the middle (linear scan)
      const idx = stack2.findIndex((e) => e.leaseId === leaseId)
      if (idx >= 0) {
        stack2.splice(idx, 1)
        tryDeleteEmpty(scopeId, token as AnyTag)
      }
    }

    return { release }
  }

  const get: ScopeRegistry['get'] = (scopeId, token) => {
    const stack = scopes.get(scopeId)?.get(token as AnyTag)
    if (!stack || stack.length === 0) return undefined
    return stack[stack.length - 1]!.value as any
  }

  const clearToken: ScopeRegistry['clearToken'] = (scopeId, token) => {
    const byToken = scopes.get(scopeId)
    if (!byToken) return
    byToken.delete(token)
    if (byToken.size === 0) {
      scopes.delete(scopeId)
    }
  }

  const clearScope: ScopeRegistry['clearScope'] = (scopeId) => {
    scopes.delete(scopeId)
  }

  const clearAll: ScopeRegistry['clearAll'] = () => {
    scopes.clear()
  }

  return { register, get, clearToken, clearScope, clearAll }
}

export const layer = (): Layer.Layer<ScopeRegistryTag, never, never> => Layer.succeed(ScopeRegistryTag, makeRegistry())
