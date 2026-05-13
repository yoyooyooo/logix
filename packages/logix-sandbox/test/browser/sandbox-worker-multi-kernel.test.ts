import { test, expect } from 'vitest'
import { createSandboxClient } from '../../src/Client.js'
import { startKernelMocks } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

const makeKernelSource = (kernelId: 'core' | 'experimental'): string => {
  return `
    import { Effect } from "./effect.js";

    export const Kernel = {
      kernelLayer: (_ref) => ({ _tag: "KernelLayer" }),
    };

    export const Runtime = {
      trial: (_root, options) =>
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
  const experimentalKernelUrl = `${window.location.origin}/sandbox/logix-core.experimental.js`

  await startKernelMocks([
    { kernelUrl: coreKernelUrl, source: makeKernelSource('core') },
    { kernelUrl: experimentalKernelUrl, source: makeKernelSource('experimental') },
  ])

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    timeout: 30000,
    kernelRegistry: {
      kernels: [
        { kernelId: 'core', kernelUrl: coreKernelUrl, label: 'core' },
        { kernelId: 'experimental', kernelUrl: experimentalKernelUrl, label: 'experimental' },
      ],
      defaultKernelId: 'core',
    },
  })

  const moduleCode = `export const AppRoot = { _tag: "DummyModule" }`

  const coreResult = await client.trial({
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

  const experimentalResult = await client.trial({
    moduleCode,
    kernelId: 'experimental',
    strict: true,
    allowFallback: false,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(experimentalResult.requestedKernelId).toBe('experimental')
  expect(experimentalResult.effectiveKernelId).toBe('experimental')
  expect(experimentalResult.fallbackReason).toBeUndefined()
  expect(experimentalResult.kernelImplementationRef && typeof experimentalResult.kernelImplementationRef === 'object').toBe(true)
  expect((experimentalResult.kernelImplementationRef as any).kernelId).toBe('experimental')
  expect(() => JSON.stringify(experimentalResult.kernelImplementationRef)).not.toThrow()
})

testFn('sandbox trial accepts Program module source with user imports', async () => {
  const coreKernelUrl = `${window.location.origin}/sandbox/logix-core.imports.js`
  await startKernelMocks([{ kernelUrl: coreKernelUrl, source: makeKernelSource('core') }])

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    timeout: 30000,
    kernelRegistry: {
      kernels: [{ kernelId: 'core', kernelUrl: coreKernelUrl, label: 'core' }],
      defaultKernelId: 'core',
    },
  })

  const result = await client.trial({
    moduleCode: [
      'import { Schema } from "effect"',
      'import * as Logix from "@logixjs/core"',
      '',
      'export const AppRoot = {',
      '  _tag: "ImportedProgram",',
      '  schemaKind: typeof Schema.Struct,',
      '  runtimeKind: typeof Logix.Runtime,',
      '}',
    ].join('\n'),
    kernelId: 'core',
    strict: true,
    allowFallback: false,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(result.effectiveKernelId).toBe('core')
  expect((result.kernelImplementationRef as any)?.kernelId).toBe('core')
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
      await client.trial({
        moduleCode,
        kernelId: 'experimental',
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
  expect(strictError?.sandboxError?.requestedKernelId).toBe('experimental')
  expect(Array.isArray(strictError?.sandboxError?.availableKernelIds)).toBe(true)

  const fallbackResult = await client.trial({
    moduleCode,
    kernelId: 'experimental',
    strict: false,
    allowFallback: true,
    diagnosticsLevel: 'off',
    maxEvents: 0,
    trialRunTimeoutMs: 1000,
    closeScopeTimeout: 500,
  })

  expect(fallbackResult.requestedKernelId).toBe('experimental')
  expect(fallbackResult.effectiveKernelId).toBe('core')
  expect(typeof fallbackResult.fallbackReason).toBe('string')
  expect((fallbackResult.kernelImplementationRef as any)?.kernelId).toBe('core')
})
