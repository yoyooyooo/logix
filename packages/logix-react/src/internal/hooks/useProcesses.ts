import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { Effect, Exit, Scope } from 'effect'
import type { ManagedRuntime } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeContext } from '../provider/ReactContext.js'
import { isDevEnv } from '../provider/env.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'

export interface UseProcessesOptions {
  /**
   * Stable identifier for a UI subtree scope.
   *
   * - Recommended: a domain boundary id (e.g. route / feature key) for diagnostics and filtering.
   * - Default: derived from React.useId() (stable for the same tree position; reusable under StrictMode).
   */
  readonly subtreeId?: string
  /**
   * Keep-alive time (ms) after unmount, to absorb StrictMode / Suspense jitter:
   * - We do not stop immediately on unmount; we close the scope after gcTime (and refCount is still 0).
   */
  readonly gcTime?: number
  /**
   * Restart semantics for stop -> start:
   * - switch (default): if the previous instance is still stopping, ensure the "current install intent" resumes after stopping finishes.
   * - exhaust: ignore this install while stopping; it will only resume on the next install.
   */
  readonly mode?: 'switch' | 'exhaust'
  readonly deps?: React.DependencyList
}

type Entry = {
  readonly key: string
  readonly signature: string
  readonly scope: Scope.CloseableScope
  refCount: number
  gcTimeout?: ReturnType<typeof setTimeout>
}

class ProcessSubtreeRegistry {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly runtime: ManagedRuntime.ManagedRuntime<any, any>) {}

  retain(args: {
    readonly key: string
    readonly signature: string
    readonly gcTime: number
    readonly install: (scope: Scope.CloseableScope) => void
  }): () => void {
    const existing = this.entries.get(args.key)

    if (existing) {
      if (existing.signature !== args.signature) {
        throw new Error(
          `[useProcesses] subtreeId "${args.key}" has already been claimed by a different process set. ` +
            `previous="${existing.signature}" current="${args.signature}". ` +
            'Use a different subtreeId or keep the processes list stable for the same subtree.',
        )
      }

      existing.refCount += 1
      if (existing.gcTimeout) {
        clearTimeout(existing.gcTimeout)
        existing.gcTimeout = undefined
      }

      return () => this.release({ key: args.key, gcTime: args.gcTime })
    }

    const scope = Effect.runSync(Scope.make()) as Scope.CloseableScope

    const entry: Entry = {
      key: args.key,
      signature: args.signature,
      scope,
      refCount: 1,
    }
    this.entries.set(args.key, entry)

    args.install(scope)

    return () => this.release({ key: args.key, gcTime: args.gcTime })
  }

  release(args: { readonly key: string; readonly gcTime: number }): void {
    const entry = this.entries.get(args.key)
    if (!entry) return

    entry.refCount = Math.max(0, entry.refCount - 1)
    if (entry.refCount > 0) return

    this.scheduleGC(entry, args.gcTime)
  }

  private scheduleGC(entry: Entry, gcTime: number): void {
    if (entry.gcTimeout) return

    if (!Number.isFinite(gcTime)) {
      return
    }

    const timeoutMs = gcTime <= 0 ? 0 : gcTime

    entry.gcTimeout = setTimeout(() => {
      const current = this.entries.get(entry.key)
      if (!current || current !== entry) return
      if (current.refCount > 0) return

      void this.runtime.runPromise(Scope.close(entry.scope, Exit.void)).catch(() => {})
      this.entries.delete(entry.key)
    }, timeoutMs)
  }
}

const RUNTIME_PROCESS_REGISTRY = new WeakMap<ManagedRuntime.ManagedRuntime<any, any>, ProcessSubtreeRegistry>()

const getRegistry = (runtime: ManagedRuntime.ManagedRuntime<any, any>): ProcessSubtreeRegistry => {
  const existing = RUNTIME_PROCESS_REGISTRY.get(runtime)
  if (existing) return existing
  const created = new ProcessSubtreeRegistry(runtime)
  RUNTIME_PROCESS_REGISTRY.set(runtime, created)
  return created
}

const stableProcessSignature = (processes: ReadonlyArray<Effect.Effect<void, any, any>>): string => {
  const ids: string[] = []
  for (let i = 0; i < processes.length; i++) {
    const def = Logix.Process.getDefinition(processes[i]!)
    ids.push(def?.processId ?? `legacy#${i}`)
  }
  return ids.join('|')
}

export function useProcesses(
  processes: ReadonlyArray<Effect.Effect<void, any, any>>,
  options?: UseProcessesOptions,
): void {
  const context = useContext(RuntimeContext)
  if (!context) {
    throw new RuntimeProviderNotFoundError('useProcesses')
  }

  const isDev = isDevEnv()
  const lastProcessesRef = useRef<ReadonlyArray<Effect.Effect<void, any, any>> | null>(null)
  const shallowEqualProcesses = (
    a: ReadonlyArray<Effect.Effect<void, any, any>> | null,
    b: ReadonlyArray<Effect.Effect<void, any, any>> | null,
  ) => !!a && !!b && a.length === b.length && a.every((item, idx) => item === b[idx])

  useEffect(() => {
    if (!isDev) return
    if (!lastProcessesRef.current) {
      lastProcessesRef.current = processes
      return
    }
    if (lastProcessesRef.current !== processes && !shallowEqualProcesses(lastProcessesRef.current, processes)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[useProcesses] received a new processes list. Memoize the list (useMemo) to avoid unnecessary install/uninstall churn.',
      )
    }
    lastProcessesRef.current = processes
  }, [isDev, processes])

  const defaultSubtreeId = React.useId()
  const subtreeId = options?.subtreeId ?? `ui:${defaultSubtreeId}`
  const signature = useMemo(() => stableProcessSignature(processes), [processes])

  const gcTime = options?.gcTime ?? context.reactConfigSnapshot.gcTime
  const mode = options?.mode ?? 'switch'

  const deps = options?.deps
    ? [...options.deps, context.runtime, subtreeId, signature, gcTime, mode]
    : [context.runtime, subtreeId, signature, gcTime, mode]

  useEffect(() => {
    if (!processes || processes.length === 0) {
      return
    }

    const runtime = context.runtime as ManagedRuntime.ManagedRuntime<any, any>
    const registry = getRegistry(runtime)

    return registry.retain({
      key: subtreeId,
      signature,
      gcTime,
      install: (scope) => {
        const program = Effect.forEach(
          processes,
          (process) =>
            Logix.InternalContracts.installProcess(process as any, {
              scope: { type: 'uiSubtree', subtreeId } as const,
              enabled: true,
              installedAt: 'uiSubtree',
              mode,
            }).pipe(
              Effect.flatMap((installation) => {
                if (installation !== undefined) {
                  return Effect.void
                }
                return Effect.forkScoped(process as any).pipe(Effect.asVoid)
              }),
              Effect.catchAll(() => Effect.forkScoped(process as any).pipe(Effect.asVoid)),
            ),
          { discard: true },
        ).pipe(Effect.provideService(Scope.Scope, scope))

        void runtime.runPromise(program).catch(() => {})
      },
    })
  }, deps)
}
