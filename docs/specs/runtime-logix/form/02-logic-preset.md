# 表单预置逻辑 (Form Logic Presets)

> **Status**: Definitive (v3.1 Strict Compliance)  
> **Layer**: Form Domain  
> **Note**: 本文档展示了基于 v3 Effect-Native 标准范式（`Logic.make` + `flow` API）的常见表单预置逻辑实现。所有旧的 `api.rule` DSL 形态已被废弃。

## 1. 配置契约 (Configuration Contract)

```typescript
export type ValidationMode = 'onChange' | 'onBlur' | 'onSubmit' | 'all';

export interface FormConfig<T> {
  initialValues: T;
  schema?: Schema<T>;
  mode?: ValidationMode;           // 默认: 'onChange'
  reValidateMode?: ValidationMode; // 默认: 'onChange'
  debounce?: DurationInput;        // 默认: '200 millis'
}
```

## 2. 核心逻辑实现 (v3 Standard Paradigm)

### 2.1 脏检查 (Dirty Check)

通过监听 `values` 的变化，并与初始值进行深度比较来更新 `isDirty` 状态。

```typescript
const $Form = Logic.forShape<FormShape>();

const dirtyCheckLogic = Logic.make<FormShape>(
  Effect.gen(function*(_) {
    const values$ = $Form.flow.fromChanges(s => s.values);
    const initialValues = (yield* $Form.state.read).initialValues; // 假设初始值在 state 中

    yield* values$.pipe(
      $Form.flow.run(values =>
        $Form.state.mutate(draft => {
          draft.ui.meta.isDirty = !deepEqual(values, initialValues);
        })
      )
    );
  })
);
```

### 2.2 智能校验策略 (Smart Validation Strategy)

将不同的触发源（字段变更、失焦、提交）合并到一个流中，并根据当前表单状态（是否有错误）和配置来决定是否执行校验。

```typescript
const $Form = Logic.forShape<FormShape, FormValidatorService>();

const smartValidationLogic = Logic.make<FormShape, FormValidatorService>(
  Effect.gen(function*(_) {
    const validator = yield* $Form.services(FormValidatorService);
    const config = (yield* $Form.state.read).config;

    // 1. 定义触发源
    const change$ = $Form.flow.fromAction(a => a._tag === 'field/change');
    const blur$ = $Form.flow.fromAction(a => a._tag === 'field/blur');
    const submit$ = $Form.flow.fromAction(a => a._tag === 'form/submit');

    // 2. 定义校验 Effect
    const validationEffect = (action: FieldChangeAction | FieldBlurAction) => 
      Effect.gen(function*(_) {
        const current = yield* $Form.state.read;
        const activeMode = current.ui.meta.isValid ? config.mode : config.reValidateMode;
        
        const shouldValidate = match(action._tag)
          .with('form/submit', () => true)
          .with('field/blur', () => activeMode === 'onBlur' || activeMode === 'all')
          .with('field/change', () => activeMode === 'onChange' || activeMode === 'all')
          .otherwise(() => false);

        if (!shouldValidate) return;

        const validationResult = yield* validator.validate(action.payload.path, current.values);
        yield* $Form.state.mutate(draft => {
          draft.ui.errors[action.payload.path] = validationResult.error;
        });
      });

    // 3. 组合流
    const changeValidation$ = change$.pipe(
      $Form.flow.debounce(config.debounce ?? '200 millis'),
      $Form.flow.runLatest(validationEffect)
    );
    const blurValidation$ = blur$.pipe($Form.flow.run(validationEffect));
    const submitValidation$ = submit$.pipe($Form.flow.run(() => validator.validateAll()));

    yield* Effect.all([changeValidation$, blurValidation$, submitValidation$], { discard: true });
  })
);
```

### 2.3 数组操作逻辑 (Array Logic)

数组操作通过专有的 Action 触发，在 Logic 中监听这些 Action 并使用 `state.mutate` 执行具体的数组方法。

```typescript
const $Form = Logic.forShape<FormShape>();

const arrayLogic = Logic.make<FormShape>(
  Effect.gen(function*(_) {
    const arrayAction$ = $Form.flow.fromAction(a => a._tag.startsWith('array/'));

    yield* arrayAction$.pipe(
      $Form.flow.run(action =>
        $Form.state.mutate(draft => {
          const { path, value, index, indexA, indexB, from, to } = action.payload;
          const arr = get(draft.values, path);
          if (!Array.isArray(arr)) return;

          switch (action._tag) {
            case 'array/append': arr.push(value); break;
            case 'array/prepend': arr.unshift(value); break;
            case 'array/remove': arr.splice(index, 1); break;
            case 'array/swap': 
              [arr[indexA], arr[indexB]] = [arr[indexB], arr[indexA]]; 
              break;
            case 'array/move':
              const [item] = arr.splice(from, 1);
              arr.splice(to, 0, item);
              break;
          }
          draft.ui.meta.isDirty = true;
        })
      )
    );
  })
);
```
