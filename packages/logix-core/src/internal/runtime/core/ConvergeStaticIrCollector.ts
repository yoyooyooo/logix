import { Effect, Layer, ServiceMap } from 'effect'
import type { ConvergeStaticIrExport } from '../../state-trait/converge-ir.js'

/**
 * ConvergeStaticIrCollector：
 * - Consumer interface for collecting ConvergeStaticIrExport (de-duplicated/indexed by staticIrDigest); an internal injectable capability.
 * - Typical implementations: DevtoolsHub (process-level) / EvidenceCollector (RunSession-level).
 *
 * Notes:
 * - Uses FiberRef<ReadonlyArray<...>> to allow appending multiple collectors within the same scope (similar to Debug sinks).
 * - ModuleRuntime reads the FiberRef value during installation and captures it in a closure, avoiding Env lookup on hot paths.
 */
export interface ConvergeStaticIrCollector {
  readonly register: (ir: ConvergeStaticIrExport) => void
}

export const currentConvergeStaticIrCollectors = ServiceMap.Reference<ReadonlyArray<ConvergeStaticIrCollector>>(
  '@logixjs/core/ConvergeStaticIrCollectors',
  {
    defaultValue: () => [],
  },
)

export const appendConvergeStaticIrCollectors = (
  collectors: ReadonlyArray<ConvergeStaticIrCollector>,
): Layer.Layer<any, never, never> =>
  Layer.effect(
    currentConvergeStaticIrCollectors,
    Effect.gen(function* () {
      const current = yield* Effect.service(currentConvergeStaticIrCollectors)
      return [...current, ...collectors]
    }),
  ) as Layer.Layer<any, never, never>
