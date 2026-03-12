import { Effect, Exit, type ServiceMap } from 'effect'

export const runSyncExitWithServices = <A, E>(
  effect: Effect.Effect<A, E, any>,
  services: ServiceMap.ServiceMap<any>,
): Exit.Exit<A, E> => Effect.runSyncExit(Effect.provideServices(effect, services) as Effect.Effect<A, E, never>)
