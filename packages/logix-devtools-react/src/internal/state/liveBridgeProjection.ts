import {
  deriveRuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/workbench-api'

export const deriveDevtoolsLiveBridgeProjection = (
  truthInputs: ReadonlyArray<RuntimeWorkbenchTruthInput>,
): RuntimeWorkbenchProjectionIndex =>
  deriveRuntimeWorkbenchProjectionIndex({
    truthInputs,
  })
