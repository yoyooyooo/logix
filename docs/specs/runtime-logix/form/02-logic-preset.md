# 表单预置逻辑 (Form Logic Presets)

> **Status**: Draft (Thin Layer on logix-core)  
> **Layer**: Form Domain  
> **Note**: 所有示例都基于 v3 Effect-Native 范式（`Logix.Module` + Bound API `$` + `Flow`），只提供「推荐写法」，不再定义新的 DSL。当前 PoC 中，请在实现里通过 `Module.logic(($)=>...)` 或显式接收 `BoundApi<Sh,R>` 的方式获取 `$`。

本节目标：给 Form 提供一组**可选**的预置 Logic，做到「不用时 0 成本，用时有标准答案」。

## 1. 配置契约 (Configuration Contract, 轻量版)

```typescript
export type ValidationMode = "onChange" | "onBlur" | "onSubmit" | "all";

export interface FormConfig<TValues> {
  readonly initialValues: TValues;
  readonly schema?: Schema.Schema<TValues>;
  readonly mode?: ValidationMode;           // 默认: "onChange"
  readonly reValidateMode?: ValidationMode; // 默认: "onChange"
  readonly debounceMs?: number;             // 默认: 200
}
```

FormConfig 可以：

- 作为 `FormState<T>` 的一部分挂在 `state.config` 上；或
- 作为 Module live 时额外注入的 Service（例如 `FormConfigTag`）；

两种方式实现上任选一种，规范层不强制，但示例统一假设 `state.config` 存在。

## 2. 核心逻辑示例 (基于 Bound API `$`)

下面示例都假定存在 Bound API `$Form`，通常由对应的 `FormModule.logic(($Form)=>...)` 注入：

```typescript
type FormShape<T> = Logix.Shape<
  Schema.Schema<FormState<T>>,
  {
    "field/change": Schema.Schema<{ path: string; value: unknown }>;
    "field/blur": Schema.Schema<{ path: string }>;
    "field/focus": Schema.Schema<{ path: string }>;
    "array/append": Schema.Schema<{ path: string; value: unknown }>;
    // ... 其他 Action 见 01-domain-model.md
  }
>;
```

### 2.1 脏检查 (Dirty Check)

监听 `values` 的变化，与 `config.initialValues` 进行深比较，更新 `ui.meta.isDirty`。

```typescript
const dirtyCheckLogic: Logic.Of<FormShape<any>> = Effect.gen(function* () {
  const values$ = $Form.flow.fromState((s) => s.values);

  yield* values$.pipe(
    $Form.flow.run((values) =>
      $Form.state.mutate((draft) => {
        const initial = draft.config?.initialValues ?? draft.values;
        draft.ui.meta.isDirty = !deepEqual(values, initial);
      }),
    ),
  );
});
```

### 2.2 智能校验策略 (Smart Validation Strategy, 收紧版)

将字段变更 / 失焦 / 提交统一收束为校验入口，复用 `Flow.runLatest` 处理异步竞态。

仅保留关键意图，省略实现细节：

```typescript
class FormValidatorService extends Context.Tag(
  "FormValidatorService",
)<FormValidatorService, {
  readonly validateField: (
    path: string,
    values: unknown,
  ) => Effect.Effect<FormIssue[] | null>;
  readonly validateAll: (
    values: unknown,
  ) => Effect.Effect<Record<string, FormIssue[]>>;
}> {}

const smartValidationLogic: Logic.Of<
  FormShape<any>,
  FormValidatorService
> = Effect.gen(function* () {
  const validator = yield* $Form.services(FormValidatorService);

  const change$ = $Form.flow.fromAction(
    (a): a is Extract<FormAction, { _tag: "field/change" }> =>
      a._tag === "field/change",
  );
  const blur$ = $Form.flow.fromAction(
    (a): a is Extract<FormAction, { _tag: "field/blur" }> =>
      a._tag === "field/blur",
  );
  const submit$ = $Form.flow.fromAction(
    (a): a is Extract<FormAction, { _tag: "form/submit" }> =>
      a._tag === "form/submit",
  );

  const validateOne = (action: { payload: { path: string } }) =>
    Effect.gen(function* () {
      const state = yield* $Form.state.read;
      const issues = yield* validator.validateField(
        action.payload.path,
        state.values,
      );
      yield* $Form.state.mutate((draft) => {
        const list = issues ?? [];
        draft.ui.fields[action.payload.path] ??= {
          touched: false,
          dirty: false,
          validating: false,
          focused: false,
          issues: [],
        };
        draft.ui.fields[action.payload.path]!.issues = list;
      });
    });

  const validateAll = Effect.gen(function* () {
    const state = yield* $Form.state.read;
    const all = yield* validator.validateAll(state.values);
    yield* $Form.state.mutate((draft) => {
      draft.ui.meta.allIssues = [];
      for (const [path, list] of Object.entries(all)) {
        draft.ui.fields[path] ??= {
          touched: false,
          dirty: false,
          validating: false,
          focused: false,
          issues: [],
        };
        draft.ui.fields[path]!.issues = list;
        draft.ui.meta.allIssues.push(...list);
      }
      draft.ui.meta.isValid = draft.ui.meta.allIssues.length === 0;
    });
  });

  const changeValidation$ = change$.pipe(
    $Form.flow.debounce(200),
    $Form.flow.runLatest(validateOne),
  );
  const blurValidation$ = blur$.pipe($Form.flow.run(validateOne));
  const submitValidation$ = submit$.pipe($Form.flow.run(validateAll));

  yield* Effect.all(
    [changeValidation$, blurValidation$, submitValidation$],
    { discard: true },
  );
});
```

### 2.3 数组操作逻辑 (Array Logic)

数组操作通过专用 Action 驱动，逻辑层只做「找到数组 + 应用操作」，并顺便更新 `isDirty`。

```typescript
const arrayLogic: Logic.Of<FormShape<any>> = Effect.gen(function* () {
  const arrayAction$ = $Form.flow.fromAction((a) =>
    a._tag.startsWith("array/"),
  );

  yield* arrayAction$.pipe(
    $Form.flow.run((action) =>
      $Form.state.mutate((draft) => {
        const { path } = (action as any).payload as { path: string };
        const arr = get(draft.values as any, path);
        if (!Array.isArray(arr)) return;

        switch (action._tag) {
          case "array/append":
            arr.push((action as any).payload.value);
            break;
          case "array/prepend":
            arr.unshift((action as any).payload.value);
            break;
          case "array/remove":
            arr.splice((action as any).payload.index, 1);
            break;
          case "array/swap": {
            const { indexA, indexB } = (action as any).payload;
            [arr[indexA], arr[indexB]] = [arr[indexB], arr[indexA]];
            break;
          }
          case "array/move": {
            const { from, to } = (action as any).payload;
            const [item] = arr.splice(from, 1);
            arr.splice(to, 0, item);
            break;
          }
        }

        draft.ui.meta.isDirty = true;
      }),
    ),
  );
});
```

以上逻辑都只是「推荐实现」，真正落地时可以根据业务场景选择性挂载到 Form Module 的 `live(...logics)` 中。
