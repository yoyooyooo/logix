import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import kernelSource from '../../../public/sandbox/logix-core.js?raw'

/**
 * 启动一个仅用于浏览器测试的 MSW Worker，
 * 拦截对 kernelUrl 的请求并返回内置的 logix-core 内核脚本。
 */
export async function startKernelMock(kernelUrl: string): Promise<ReturnType<typeof setupWorker>> {
  const worker = setupWorker(
    http.get(kernelUrl, () => {
      return new HttpResponse(kernelSource, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
        },
      })
    }),
  )

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })

  return worker
}
