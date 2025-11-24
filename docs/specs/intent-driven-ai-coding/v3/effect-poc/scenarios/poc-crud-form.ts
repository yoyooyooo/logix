import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface EntityForm {
  id?: string;
  values: Record<string, unknown>;
}

// 表单加载：根据 id 调用 EntityService.load 并写入固定状态路径
export const CrudFormLoadPattern = definePattern<{
  id: string;
  targetPath?: string;
}>({
  id: "poc/crud-form/load",
  version: "1.0.0",
  tags: ["crud", "load"],
  config: Schema.Struct({
    id: Schema.String,
    targetPath: Schema.optional(Schema.String)
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log("crudForm.load.start");

      const form = yield* dsl.call<EntityForm>(
        "EntityService",
        "load",
        { id: config.id }
      );

      // 默认写入 ui.form，允许通过 targetPath 覆盖
      const path = config.targetPath ?? "ui.form";
      yield* dsl.set(path, form);

      yield* dsl.log("crudForm.load.done");
    })
});

// 表单提交：校验 -> create / update -> 通知
export const CrudFormSubmitPattern = definePattern<{
  form: EntityForm;
}>({
  id: "poc/crud-form/submit",
  version: "1.0.0",
  tags: ["crud", "submit"],
  config: Schema.Struct({
    form: Schema.Struct({
      id: Schema.optional(Schema.String),
      values: Schema.Record({
        key: Schema.String,
        value: Schema.Unknown
      })
    })
  }),
  body: ({ form }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log("crudForm.submit.start");

      const result = yield* dsl.call<{
        valid: boolean;
        errors?: Record<string, string>;
      }>(
        "ValidationService",
        "validate",
        form
      );

      if (!result.valid) {
        yield* dsl.log(
          `crudForm.submit.invalid errors=${JSON.stringify(result.errors ?? {})}`
        );
        yield* dsl.call(
          "NotificationService",
          "error",
          { message: "表单校验失败" }
        );
        return;
      }

      if (form.id) {
        yield* dsl.call(
          "EntityService",
          "update",
          form
        );
        yield* dsl.call(
          "NotificationService",
          "success",
          { message: "更新成功" }
        );
      } else {
        const created = yield* dsl.call<{ id: string }>(
          "EntityService",
          "create",
          form
        );
        yield* dsl.call(
          "NotificationService",
          "success",
          { message: "创建成功" }
        );
        yield* dsl.log(
          `crudForm.submit.created id=${created.id}`
        );
      }

      yield* dsl.log("crudForm.submit.done");
    })
});

