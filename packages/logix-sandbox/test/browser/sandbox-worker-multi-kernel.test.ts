import { test, expect } from 'vitest'
import { createSandboxClient } from '@logixjs/sandbox'
import { startKernelMocks } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

const makeKernelSource = (kernelId: 'core' | 'core-ng'): string => {
  return `
    import { Effect } from "./effect.js";

    export const Kernel = {
      kernelLayer: (_ref) => ({ _tag: "KernelLayer" }),
    };

    export const Observability = {
      trialRunModule: (_root, options) =>
        Effect.succeed({
          runId: options?.runId ?? "run:unknown",
          ok: true,
          environment: {
            tagIds: [],
            configKeys: [],
            missingServices: [],
            missingConfigKeys: [],
            kernelImplementationRef: { kernelId: "${kernelId}", packageName: "@logixjs/core" },
          },
        }),
    };
  `
}

testFn('sandbox worker multi-kernel: per-run kernel selection and result summary', async () => {
  const coreKernelUrl = `${window.location.origin}/sandbox/logix-core.core.js`
  const coreNgKernelUrl = `${window.location.origin}/sandbox/logix-core.core-ng.js`

  await startKernelMocks([
    { kernelUrl: coreKernelUrl, source: makeKernelSource('core') },
    { kernelUrl: coreNgKernelUrl, source: makeKernelSource('core-ng') },
  ])

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    timeout: 30000,
    kernelRegistry: {
      kernels: [
        { kernelId: 'core', kernelUrl: coreKernelUrl, label: 'core' },
        { kernelId: 'core-ng', kernelUrl: coreNgKernelUrl, label: 'core-ng' },
      ],
      defaultKernelId: 'core-ng',
    },
  })

  const moduleCode = `export const AppRoot = { _tag: "DummyModule" }`

  const coreResult = await client.trialRunModule({
    moduleCode,
    kernelId: 'core',
    strict: true,
    allowFallback: false,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(coreResult.requestedKernelId).toBe('core')
  expect(coreResult.effectiveKernelId).toBe('core')
  expect(coreResult.fallbackReason).toBeUndefined()
  expect(coreResult.kernelImplementationRef && typeof coreResult.kernelImplementationRef === 'object').toBe(true)
  expect((coreResult.kernelImplementationRef as any).kernelId).toBe('core')
  expect(() => JSON.stringify(coreResult.kernelImplementationRef)).not.toThrow()

  const coreNgResult = await client.trialRunModule({
    moduleCode,
    kernelId: 'core-ng',
    strict: true,
    allowFallback: false,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(coreNgResult.requestedKernelId).toBe('core-ng')
  expect(coreNgResult.effectiveKernelId).toBe('core-ng')
  expect(coreNgResult.fallbackReason).toBeUndefined()
  expect(coreNgResult.kernelImplementationRef && typeof coreNgResult.kernelImplementationRef === 'object').toBe(true)
  expect((coreNgResult.kernelImplementationRef as any).kernelId).toBe('core-ng')
  expect(() => JSON.stringify(coreNgResult.kernelImplementationRef)).not.toThrow()
})

testFn('sandbox worker multi-kernel: strict/fallback semantics are explainable', async () => {
  const coreKernelUrl = `${window.location.origin}/sandbox/logix-core.single.js`
  await startKernelMocks([{ kernelUrl: coreKernelUrl, source: makeKernelSource('core') }])

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    timeout: 30000,
    kernelRegistry: {
      kernels: [{ kernelId: 'core', kernelUrl: coreKernelUrl, label: 'core' }],
      defaultKernelId: 'core',
    },
  })

  const moduleCode = `export const AppRoot = { _tag: "DummyModule" }`

  const strictError = await (async () => {
    try {
      await client.trialRunModule({
        moduleCode,
        kernelId: 'core-ng',
        strict: true,
        allowFallback: false,
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })
      return null
    } catch (e) {
      return e as any
    }
  })()

  expect(strictError).not.toBeNull()
  expect(String(strictError?.message)).toContain('Kernel not available')
  expect(strictError?.sandboxError?.requestedKernelId).toBe('core-ng')
  expect(Array.isArray(strictError?.sandboxError?.availableKernelIds)).toBe(true)

  const fallbackResult = await client.trialRunModule({
    moduleCode,
    kernelId: 'core-ng',
    strict: false,
    allowFallback: true,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(fallbackResult.requestedKernelId).toBe('core-ng')
  expect(fallbackResult.effectiveKernelId).toBe('core')
  expect(typeof fallbackResult.fallbackReason).toBe('string')
  expect((fallbackResult.kernelImplementationRef as any)?.kernelId).toBe('core')
})
