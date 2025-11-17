import { HttpApi } from '@effect/platform'

import { HealthGroup } from '../health/health.contract.js'
import { SpecboardGroup } from '../specboard/specboard.contract.js'

export const EffectApi = HttpApi.make('EffectApi').add(HealthGroup).add(SpecboardGroup)
