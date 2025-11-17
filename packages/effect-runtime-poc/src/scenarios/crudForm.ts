import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface EntityForm {
  id?: string
  // 简化：真实项目中可泛型化
  values: Record<string, unknown>
}

export interface EntityService {
  load: (id: string) => Promise<EntityForm>
  create: (input: EntityForm) => Promise<{ id: string }>
  update: (input: EntityForm) => Promise<void>
}

export interface ValidationService {
  validate: (input: EntityForm) => Promise<{ valid: boolean; errors?: Record<string, string> }>
}

export interface NotificationService {
  success: (msg: string) => void
  error: (msg: string) => void
}

export interface CrudFormEnv extends BasePlatformEnv {
  EntityService: EntityService
  ValidationService: ValidationService
  NotificationService: NotificationService
}

export const loadFormFlow = (id: string): Fx<CrudFormEnv, never, EntityForm> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<CrudFormEnv>()
    env.logger.info('crudForm.load.start', { id })
    const form = yield* Effect.promise(() => env.EntityService.load(id))
    env.logger.info('crudForm.load.done', { id })
    return form
  })

export const submitFormFlow: Fx<CrudFormEnv, never, void> = Effect.gen(function* () {
  const env = yield* Effect.context<CrudFormEnv>()

  // 在真实实现中，表单值通常由 UI 通过参数传入或从外部 state 读取；
  // PoC 可简化为从某个固定来源读取。
  const form: EntityForm = { values: {} }

  env.logger.info('crudForm.submit.start', {})

  const result = yield* Effect.promise(() => env.ValidationService.validate(form))
  if (!result.valid) {
    env.logger.info('crudForm.submit.invalid', { errors: result.errors })
    env.NotificationService.error('表单校验失败')
    return
  }

  if (form.id) {
    yield* Effect.promise(() => env.EntityService.update(form))
    env.NotificationService.success('更新成功')
  } else {
    const created = yield* Effect.promise(() => env.EntityService.create(form))
    env.NotificationService.success('创建成功')
    env.logger.info('crudForm.submit.created', { id: created.id })
  }

  env.logger.info('crudForm.submit.done', {})
})

