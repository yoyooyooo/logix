import { createLiveDaemonServer } from './liveDaemonServer.js'
import { resolveLiveTransportPaths } from './liveTransportPaths.js'

export const runLiveDaemonRuntime = async (): Promise<void> => {
  const paths = resolveLiveTransportPaths()
  const daemon = await createLiveDaemonServer(paths).start()

  const stop = async () => {
    await daemon.stop()
    process.exit(0)
  }

  process.once('SIGINT', () => {
    void stop()
  })
  process.once('SIGTERM', () => {
    void stop()
  })
}
