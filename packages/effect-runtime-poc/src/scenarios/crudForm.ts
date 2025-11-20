import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface EntityForm {
  id?: string;
  // 简化：真实项目中可泛型化
  values: Record<string, unknown>;
}

export interface EntityService {
  load: (id: string) => Promise<EntityForm>;
  create: (input: EntityForm) => Promise<{ id: string }>;
  update: (input: EntityForm) => Promise<void>;
}

export interface ValidationService {
  validate: (input: EntityForm) => Promise<{
    valid: boolean;
    errors?: Record<string, string>;
  }>;
}

export interface NotificationService {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

export class EntityServiceTag extends Context.Tag("EntityService")<
  EntityServiceTag,
  EntityService
>() {}

export class ValidationServiceTag extends Context.Tag("ValidationService")<
  ValidationServiceTag,
  ValidationService
>() {}

export class CrudNotificationServiceTag extends Context.Tag(
  "CrudNotificationService",
)<CrudNotificationServiceTag, NotificationService>() {}

export type CrudFormEnv =
  | LoggerTag
  | EntityServiceTag
  | ValidationServiceTag
  | CrudNotificationServiceTag;

export const loadFormFlow = (
  id: string,
): Effect.Effect<EntityForm, never, CrudFormEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const entity = yield* EntityServiceTag;

    logger.info("crudForm.load.start", { id });
    const form = yield* Effect.promise(() => entity.load(id));
    logger.info("crudForm.load.done", { id });
    return form;
  });

export const submitFormFlow = (
  form: EntityForm,
): Effect.Effect<void, never, CrudFormEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const entity = yield* EntityServiceTag;
    const validate = yield* ValidationServiceTag;
    const notification = yield* CrudNotificationServiceTag;

    logger.info("crudForm.submit.start", {});

    const result = yield* Effect.promise(() => validate.validate(form));
    if (!result.valid) {
      logger.info("crudForm.submit.invalid", { errors: result.errors });
      notification.error("表单校验失败");
      return;
    }

    if (form.id) {
      yield* Effect.promise(() => entity.update(form));
      notification.success("更新成功");
    } else {
      const created = yield* Effect.promise(() => entity.create(form));
      notification.success("创建成功");
      logger.info("crudForm.submit.created", { id: created.id });
    }

    logger.info("crudForm.submit.done", {});
  });
