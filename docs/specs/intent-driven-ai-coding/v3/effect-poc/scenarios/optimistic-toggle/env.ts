import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface ToggleService {
  toggleFlag: (input: { id: string; nextValue: boolean }) => Promise<void>
}

export interface OptimisticToggleEnv extends BasePlatformEnv {
  ToggleService: ToggleService
}

