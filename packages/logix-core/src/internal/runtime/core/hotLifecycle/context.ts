import { Effect, Layer, Option, ServiceMap } from 'effect'
import type { RuntimeHotLifecycleOwner, RuntimeResourceRef } from './types.js'

export const currentRuntimeHotLifecycleOwner = ServiceMap.Reference<RuntimeHotLifecycleOwner | undefined>(
  '@logixjs/core/repo-internal/runtime-hot-lifecycle.currentOwner',
  {
    defaultValue: () => undefined,
  },
)

export const runtimeHotLifecycleOwnerLayer = (
  owner: RuntimeHotLifecycleOwner,
): Layer.Layer<any, never, never> =>
  Layer.succeed(currentRuntimeHotLifecycleOwner, owner) as Layer.Layer<any, never, never>

export const getCurrentRuntimeHotLifecycleOwner = (): Effect.Effect<
  RuntimeHotLifecycleOwner | undefined,
  never,
  never
> =>
  Effect.serviceOption(currentRuntimeHotLifecycleOwner).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value : undefined)),
  )

export interface RuntimeHotLifecycleContext {
  readonly owner: RuntimeHotLifecycleOwner
  readonly runtimeInstanceId: string
  readonly register: (ref: Omit<RuntimeResourceRef, 'ownerId'> & { readonly ownerId?: string }) => void
  readonly isCurrent: () => boolean
}

export const makeRuntimeHotLifecycleContext = (
  owner: RuntimeHotLifecycleOwner,
): RuntimeHotLifecycleContext => {
  const runtimeInstanceId = owner.getStatus().runtimeInstanceId
  return {
    owner,
    runtimeInstanceId,
    register: (ref) => {
      owner.registry.register({
        ...ref,
        ownerId: ref.ownerId ?? owner.ownerId,
      })
    },
    isCurrent: () => {
      const status = owner.getStatus()
      return !status.disposed && status.runtimeInstanceId === runtimeInstanceId
    },
  }
}
