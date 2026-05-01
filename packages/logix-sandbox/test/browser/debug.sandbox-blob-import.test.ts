import { test } from 'vitest'
import { createSandboxClient } from '../../src/Client.js'
import { startKernelMock } from './msw/kernel-mock.js'

test('debug sandbox blob import', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 30000,
  })

  await client.init()

  const code = `
    import { Effect } from "effect";
    export default Effect.succeed({ ok: true });
  `

  const compileResult = await client.compile(code, 'debug-program.ts')
  if (!compileResult.success || !compileResult.bundle) {
    // eslint-disable-next-line no-console
    console.log('compile failed', compileResult)
    return
  }

  // eslint-disable-next-line no-console
  console.log('bundle head', compileResult.bundle.slice(0, 800))

  const blob = new Blob([compileResult.bundle], { type: 'application/javascript' })
  const blobUrl = URL.createObjectURL(blob)

  try {
    const mod = await import(/* @vite-ignore */ blobUrl)
    // eslint-disable-next-line no-console
    console.log('blob import ok', Object.keys(mod))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('blob import failed', error)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
})

test('debug sandbox blob import inside module worker', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 30000,
  })

  await client.init()

  const code = `
    import { Effect } from "effect";
    export default Effect.succeed({ ok: true });
  `

  const compileResult = await client.compile(code, 'debug-worker-program.ts')
  if (!compileResult.success || !compileResult.bundle) {
    // eslint-disable-next-line no-console
    console.log('worker compile failed', compileResult)
    return
  }

  const workerScript = `
    self.onmessage = async (event) => {
      const blob = new Blob([event.data.bundle], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      try {
        const mod = await import(blobUrl)
        self.postMessage({ ok: true, keys: Object.keys(mod) })
      } catch (error) {
        self.postMessage({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    }
  `

  const workerBlob = new Blob([workerScript], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(workerBlob)

  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const worker = new Worker(workerUrl, { type: 'module' })
      worker.onmessage = (event) => {
        worker.terminate()
        resolve(event.data as Record<string, unknown>)
      }
      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }
      worker.postMessage({ bundle: compileResult.bundle })
    })

    // eslint-disable-next-line no-console
    console.log('worker blob import result', result)
  } finally {
    URL.revokeObjectURL(workerUrl)
  }
})

test('debug sandbox handleRun flow inside module worker', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 30000,
  })

  await client.init()

  const code = `
    import { Effect } from "effect";
    export default Effect.gen(function* () {
      yield* Effect.log("hello from debug worker");
      return { ok: true };
    });
  `

  const compileResult = await client.compile(code, 'debug-run-program.ts')
  if (!compileResult.success || !compileResult.bundle) {
    // eslint-disable-next-line no-console
    console.log('handleRun compile failed', compileResult)
    return
  }

  const workerScript = `
    self.onmessage = async (event) => {
      const { bundle, effectUrl } = event.data
      const blob = new Blob([bundle], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      try {
        const mod = await import(blobUrl)
        const program = mod.default
        const effectModule = await import(effectUrl)
        const { Effect, Logger, LogLevel } = effectModule
        const SandboxLogger = Logger.make(({ logLevel, message }) => {
          const level =
            LogLevel.greaterThanEqual(logLevel, LogLevel.Error) ? 'error'
            : LogLevel.greaterThanEqual(logLevel, LogLevel.Warning) ? 'warn'
            : LogLevel.greaterThanEqual(logLevel, LogLevel.Info) ? 'info'
            : 'debug'
          self.postMessage({ log: { level, message } })
        })

        const effectToRun = Effect.gen(function* () {
          const res = yield* program
          return res
        }).pipe(
          Effect.withLogger(SandboxLogger),
          Effect.withSpan('debug-run'),
        )

        const result = await Effect.runPromise(effectToRun)
        self.postMessage({ ok: true, result })
      } catch (error) {
        self.postMessage({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    }
  `

  const workerBlob = new Blob([workerScript], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(workerBlob)

  try {
    const messages = await new Promise<ReadonlyArray<Record<string, unknown>>>((resolve, reject) => {
      const worker = new Worker(workerUrl, { type: 'module' })
      const acc: Array<Record<string, unknown>> = []
      const timeoutId = setTimeout(() => {
        worker.terminate()
        reject(new Error('debug handleRun timeout'))
      }, 10000)
      worker.onmessage = (event) => {
        acc.push(event.data as Record<string, unknown>)
        if ((event.data as any)?.ok !== undefined) {
          clearTimeout(timeoutId)
          worker.terminate()
          resolve(acc)
        }
      }
      worker.onerror = (error) => {
        clearTimeout(timeoutId)
        worker.terminate()
        reject(error)
      }
      worker.postMessage({
        bundle: compileResult.bundle,
        effectUrl: `${window.location.origin}/sandbox/effect.js`,
      })
    })

    // eslint-disable-next-line no-console
    console.log('worker handleRun messages', messages)
  } finally {
    URL.revokeObjectURL(workerUrl)
  }
})

test('debug sandbox import @logixjs/core inside module worker', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 30000,
  })

  await client.init()

  const code = `
    import * as Logix from "@logixjs/core";
    export default { ok: typeof Logix.Runtime?.make === "function" };
  `

  const compileResult = await client.compile(code, 'debug-logix-import.ts')
  if (!compileResult.success || !compileResult.bundle) {
    // eslint-disable-next-line no-console
    console.log('logix import compile failed', compileResult)
    return
  }

  const workerScript = `
    self.onmessage = async (event) => {
      const blob = new Blob([event.data.bundle], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      try {
        const mod = await import(blobUrl)
        self.postMessage({ ok: true, value: mod.default })
      } catch (error) {
        self.postMessage({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    }
  `

  const workerBlob = new Blob([workerScript], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(workerBlob)

  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const worker = new Worker(workerUrl, { type: 'module' })
      worker.onmessage = (event) => {
        worker.terminate()
        resolve(event.data as Record<string, unknown>)
      }
      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }
      worker.postMessage({ bundle: compileResult.bundle })
    })

    // eslint-disable-next-line no-console
    console.log('worker logix import result', result)
  } finally {
    URL.revokeObjectURL(workerUrl)
  }
})

test('debug direct import of kernel in main thread and module worker', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  try {
    const kernel = await import(/* @vite-ignore */ kernelUrl)
    // eslint-disable-next-line no-console
    console.log('main thread kernel import keys', Object.keys(kernel).slice(0, 10))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('main thread kernel import failed', error)
  }

  const workerScript = `
    self.onmessage = async (event) => {
      try {
        const mod = await import(event.data.kernelUrl)
        self.postMessage({ ok: true, keys: Object.keys(mod).slice(0, 10) })
      } catch (error) {
        self.postMessage({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      }
    }
  `
  const workerBlob = new Blob([workerScript], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(workerBlob)

  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const worker = new Worker(workerUrl, { type: 'module' })
      worker.onmessage = (event) => {
        worker.terminate()
        resolve(event.data as Record<string, unknown>)
      }
      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }
      worker.postMessage({ kernelUrl })
    })

    // eslint-disable-next-line no-console
    console.log('worker direct kernel import result', result)
  } finally {
    URL.revokeObjectURL(workerUrl)
  }
})
