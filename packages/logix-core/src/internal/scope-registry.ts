import { Layer, ManagedRuntime, ServiceMap } from 'effect'
import { isDevEnv } from './runtime/core/env.js'

export type ScopeId = string

type AnyTag = ServiceMap.Key<any, any>

type LeaseId = number

type Entry = {
  readonly leaseId: LeaseId
  readonly value: unknown
}

export interface ScopeRegistry {
  readonly register: <A>(scopeId: ScopeId, token: ServiceMap.Key<any, A>, value: A) => { readonly release: () => void }
  readonly get: <A>(scopeId: ScopeId, token: ServiceMap.Key<any, A>) => A | undefined
  readonly clearToken: (scopeId: ScopeId, token: AnyTag) => void
  readonly clearScope: (scopeId: ScopeId) => void
  readonly clearAll: () => void
}

export class ScopeRegistryTag extends ServiceMap.Service<ScopeRegistryTag, ScopeRegistry>()('@logixjs/core/ScopeRegistry') {}

export class ScopedRuntimeTag extends ServiceMap.Service<
  ScopedRuntimeTag,
  ManagedRuntime.ManagedRuntime<any, any>
>()('@logixjs/core/ScopeRegistry/ScopedRuntime') {}

export const internal = {
  ScopeRegistryTag,
  ScopedRuntimeTag,
}

const makeRegistry = (): ScopeRegistry => {
  let nextLeaseId: LeaseId = 0
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

    if (isDevEnv() && stack.length > 0) {
      console.debug(
        `[ScopeRegistry] Multiple registrations detected for scopeId="${scopeId}". ` +
          `This is allowed (LIFO), but usually indicates scopeId collisions or missing cleanup.`,
      )
    }

    stack.push({ leaseId, value })

    const release = () => {
      const stack2 = scopes.get(scopeId)?.get(token as AnyTag)
      if (!stack2 || stack2.length === 0) return

      const last = stack2[stack2.length - 1]
      if (last && last.leaseId === leaseId) {
        stack2.pop()
        tryDeleteEmpty(scopeId, token as AnyTag)
        return
      }

      const idx = stack2.findIndex((entry) => entry.leaseId === leaseId)
      if (idx >= 0) {
        stack2.splice(idx, 1)
        tryDeleteEmpty(scopeId, token as AnyTag)
      }
    }

    return { release }
  }

  const get: ScopeRegistry['get'] = (scopeId, token) => {
    const stack = scopes.get(scopeId)?.get(token as AnyTag)
    const last = stack?.[stack.length - 1]
    return last?.value as any
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
