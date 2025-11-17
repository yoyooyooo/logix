declare module '@logix/core-ng' {
  import type { Layer } from 'effect'

  export interface CoreNgKernelLayerOptions {
    readonly packageVersion?: string
    readonly buildId?: string
    readonly capabilities?: ReadonlyArray<string>
  }

  export const coreNgKernelLayer: (options?: CoreNgKernelLayerOptions) => Layer.Layer<any, never, never>
  export const coreNgFullCutoverLayer: (options?: CoreNgKernelLayerOptions) => Layer.Layer<any, never, never>
}
