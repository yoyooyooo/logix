import type { Effect } from '../../effect-poc/shared/effect-types'
import type { CrudFormEnv, EntityForm } from './env'

export const loadFormFlow =
  (id: string): Effect<CrudFormEnv, never, EntityForm> =>
  async env => {
    env.logger.info('crudForm.load.start', { id })
    const form = await env.EntityService.load(id)
    env.logger.info('crudForm.load.done', { id })
    return form
  }

export const submitFormFlow: Effect<CrudFormEnv, never, void> = async env => {
  // 在真实实现中，表单值通常由 UI 通过参数传入或从外部 state 读取；
  // PoC 可简化为从某个固定来源读取。
  const form: EntityForm = { values: {} }

  env.logger.info('crudForm.submit.start', {})

  const result = await env.ValidationService.validate(form)
  if (!result.valid) {
    env.logger.info('crudForm.submit.invalid', { errors: result.errors })
    env.NotificationService.error('表单校验失败')
    return
  }

  if (form.id) {
    await env.EntityService.update(form)
    env.NotificationService.success('更新成功')
  } else {
    const created = await env.EntityService.create(form)
    env.NotificationService.success('创建成功')
    env.logger.info('crudForm.submit.created', { id: created.id })
  }

  env.logger.info('crudForm.submit.done', {})
}

