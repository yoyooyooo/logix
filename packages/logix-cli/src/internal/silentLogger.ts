import { Layer, Logger } from 'effect'

export const silentLoggerLayer = Logger.replace(Logger.defaultLogger, Logger.make(() => {})) as unknown as Layer.Layer<
  any,
  never,
  never
>

