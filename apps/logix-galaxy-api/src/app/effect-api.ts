import { HttpApi } from '@effect/platform'

import { AuthGroup } from '../auth/auth.contract.js'
import { HealthGroup } from '../health/health.contract.js'
import { ProjectGroup } from '../project/project.contract.js'
import { TodoGroup } from '../todo/todo.contract.js'
import { UserGroup } from '../user/user.contract.js'

export const EffectApiBase = HttpApi.make('EffectApi').add(HealthGroup).add(TodoGroup)

export const EffectApiAuth = EffectApiBase.add(AuthGroup).add(UserGroup)

export const EffectApi = EffectApiAuth.add(ProjectGroup)
