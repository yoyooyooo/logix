import { HttpApi } from 'effect/unstable/httpapi'

import { HealthGroup } from '../health/health.contract.js'
import { TodoGroup } from '../todo/todo.contract.js'

export const EffectApi = HttpApi.make('EffectApi').add(HealthGroup).add(TodoGroup)
