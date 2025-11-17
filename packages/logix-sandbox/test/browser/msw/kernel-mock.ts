import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import kernelSource from '../../../public/sandbox/logix-core.js?raw'

export type KernelMock = {
  readonly kernelUrl: string
  readonly source: string
}

/**
 * Start an MSW worker for browser tests only,
 * intercepting requests to `kernelUrl` and returning the bundled `logix-core` kernel script.
 */
export async function startKernelMock(
  kernelUrl: string,
  source: string = kernelSource,
): Promise<ReturnType<typeof setupWorker>> {
  return startKernelMocks([{ kernelUrl, source }])
}

export async function startKernelMocks(kernels: ReadonlyArray<KernelMock>): Promise<ReturnType<typeof setupWorker>> {
  const worker = setupWorker(
    ...kernels.map((k) =>
      http.get(k.kernelUrl, () => {
        return new HttpResponse(k.source, {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
          },
        })
      }),
    ),
  )

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })

  return worker
}
