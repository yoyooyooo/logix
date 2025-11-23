import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

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

