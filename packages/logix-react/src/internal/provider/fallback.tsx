import React, { useEffect, useState } from 'react'
import type { ManagedRuntime } from 'effect'
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'
import type { RuntimeProviderPolicyMode } from './policy.js'
import { isDevEnv } from './env.js'
import { getFallbackWarningDocsPrefixEnv, getFallbackWarningDocsUrl } from './docs.js'

const FALLBACK_WARNED_BY_RUNTIME = new WeakMap<object, Set<string>>()
const DEFAULT_FALLBACK_WARN_THRESHOLD_MS = 100
const DEFAULT_FALLBACK_FLASH_HINT_MIN_MS = 16

export type FallbackPhase = 'provider.gating' | 'react.suspense'

export const DefaultRuntimeFallback: React.FC<{
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
}> = ({ phase, policyMode }) => {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start))
    }, 100)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const message = phase === 'provider.gating' ? 'Logix 运行时准备中…' : 'Logix 模块解析中…'

  return (
    <div
      style={{
        padding: 12,
        fontSize: 13,
        lineHeight: 1.4,
        opacity: 0.85,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      <div>
        {message} {elapsedMs}ms
      </div>
      <div style={{ marginTop: 6, opacity: 0.8 }}>
        policy.mode={policyMode}（想“无等待”→ sync；想“少闪烁”→ defer+preload）
      </div>
    </div>
  )
}

export const resolveRuntimeProviderFallback = (args: {
  readonly fallback: React.ReactNode | undefined
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
}): React.ReactNode => {
  if (args.fallback !== undefined) {
    return args.fallback
  }
  if (!isDevEnv()) {
    return null
  }
  return <DefaultRuntimeFallback phase={args.phase} policyMode={args.policyMode} />
}

const recordFallbackDuration = (args: {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
  readonly durationMs: number
  readonly blockers?: string
}): void => {
  if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
    return
  }

  void args.runtime
    .runPromise(
      Logix.Debug.record({
        type: 'trace:react.fallback.duration',
        data: {
          phase: args.phase,
          policyMode: args.policyMode,
          durationMs: Math.round(args.durationMs * 100) / 100,
          blockers: args.blockers,
        },
      }) as unknown as Effect.Effect<void, never, never>,
    )
    .catch(() => {})
}

const warnFallbackDuration = (args: {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
  readonly durationMs: number
  readonly blockers?: string
}): void => {
  if (!isDevEnv()) {
    return
  }

  const warnThresholdMs = DEFAULT_FALLBACK_WARN_THRESHOLD_MS
  const isVisibleLong = args.durationMs >= warnThresholdMs
  const isFlashHint =
    args.phase === 'react.suspense' &&
    args.policyMode !== 'sync' &&
    args.durationMs >= DEFAULT_FALLBACK_FLASH_HINT_MIN_MS &&
    args.durationMs < warnThresholdMs

  if (!isVisibleLong && !isFlashHint) {
    return
  }

  const runtimeKey = args.runtime as unknown as object
  const warned = FALLBACK_WARNED_BY_RUNTIME.get(runtimeKey) ?? new Set<string>()
  FALLBACK_WARNED_BY_RUNTIME.set(runtimeKey, warned)

  const kind = isVisibleLong ? 'visible' : 'flash'
  const dedupeKey = `${kind}::${args.phase}::${args.policyMode}::${args.blockers ?? 'none'}`
  if (warned.has(dedupeKey)) {
    return
  }
  warned.add(dedupeKey)

  const docs = `Docs: ${getFallbackWarningDocsUrl()} (override via ${getFallbackWarningDocsPrefixEnv()})`
  const header = isVisibleLong ? '[Logix][React] Fallback visible' : '[Logix][React] Suspense fallback resolved quickly'

  const hint = (() => {
    if (isVisibleLong) {
      if (args.phase === 'provider.gating') {
        return args.policyMode === 'sync'
          ? 'Hint: You are using policy.mode="sync", but the provider is still waiting for dependencies (layer/config). Consider using "suspend"/"defer" (default UX), and/or make your layer/config ready earlier.'
          : 'Hint: RuntimeProvider is still waiting for dependencies (layer/config/preload). Provide a fallback, use defer+preload, or switch to sync (deterministic, but render-blocking).'
      }
      return 'Hint: Suspense fallback is active (module resolve). If you prefer fewer fallbacks, use defer+preload; if you prefer “no waiting”, switch to policy.mode="sync" (moves the cost to render-time sync blocking).'
    }

    return 'Hint: This fallback is short. If you want to eliminate the flicker, consider policy.mode="sync" (but it may introduce render-time sync blocking).'
  })()

  const example = (() => {
    if (isFlashHint) {
      return 'Example: <RuntimeProvider policy={{ mode: "sync" }} fallback={<Loading />}>…</RuntimeProvider>'
    }
    return args.phase === 'provider.gating'
      ? 'Example: <RuntimeProvider policy={{ mode: "defer", preload: [MyImpl] }} fallback={<Loading />}>…</RuntimeProvider>'
      : 'Example: <RuntimeProvider policy={{ mode: "sync" }} fallback={<Loading />}>…</RuntimeProvider>'
  })()

  // eslint-disable-next-line no-console
  const log = isVisibleLong ? console.warn : console.info

  // eslint-disable-next-line no-console
  log(
    header,
    `(${Math.round(args.durationMs)}ms)`,
    '\n',
    `phase=${args.phase}`,
    '\n',
    `policy.mode=${args.policyMode}`,
    args.blockers ? `\nblockers=${args.blockers}` : '',
    '\n',
    hint,
    '\n',
    example,
    '\n',
    docs,
  )
}

const FallbackProbeEnabled: React.FC<{
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
  readonly blockers?: string
  readonly children: React.ReactNode
}> = ({ runtime, phase, policyMode, blockers, children }) => {
  useEffect(() => {
    const startedAt = performance.now()
    return () => {
      const durationMs = performance.now() - startedAt
      recordFallbackDuration({ runtime, phase, policyMode, durationMs, blockers })
      warnFallbackDuration({ runtime, phase, policyMode, durationMs, blockers })
    }
  }, [runtime, phase, policyMode, blockers])

  return <>{children}</>
}

const FallbackProbeNoop: React.FC<{
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
  readonly blockers?: string
  readonly children: React.ReactNode
}> = ({ children }) => <>{children}</>

export const FallbackProbe: React.FC<{
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly phase: FallbackPhase
  readonly policyMode: RuntimeProviderPolicyMode
  readonly blockers?: string
  readonly children: React.ReactNode
}> = (props) => {
  const enabled = isDevEnv() || Logix.Debug.isDevtoolsEnabled()
  const Impl = enabled ? FallbackProbeEnabled : FallbackProbeNoop
  return <Impl {...props} />
}
