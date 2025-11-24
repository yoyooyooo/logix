# 预置逻辑 (Logic Preset)

> **Status**: Definitive (v3.1 Strict Compliance)
> **Layer**: Form Domain

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

## 2. 核心逻辑实现 (Logic Implementation)

### 2.1 脏检查 (Dirty Check)

使用 **Dynamic Arguments** 特性，直接在 `set` 中计算值。

```typescript
api.rule({
  name: 'DirtyCheck',
  trigger: api.on.change(s => s.values),
  // 利用 DSL 的动态参数能力：第二个参数可以是 (ctx) => value
  do: api.ops.set(
    s => s.ui.meta.isDirty,
    (ctx) => !deepEqual(ctx.value, config.initialData)
  )
});
```

### 2.2 智能校验策略 (Smart Validation Strategy)

逻辑过于复杂（涉及多条件分支），不适合强制使用 DSL。根据规范，采用 **Native Effect Mode** 实现。

```typescript
api.rule({
  name: 'SmartValidationTrigger',
  trigger: api.on.any(
    api.on.action('field/change'),
    api.on.action('field/blur'),
    api.on.action('form/submit')
  ),
  // 切换到 Native Effect 模式以处理复杂控制流
  do: Effect.gen(function*() {
    const ctx = yield* api.context;
    const state = yield* api.get;
    
    const { mode, reValidateMode } = config;
    const actionType = ctx.action.type;
    const hasErrors = !state.ui.meta.isValid;
    
    // 1. 决策逻辑
    const activeMode = hasErrors ? (reValidateMode ?? mode) : mode;
    const shouldValidate = match(actionType)
      .with('form/submit', () => true)
      .with('field/blur', () => activeMode === 'onBlur' || activeMode === 'all')
      .with('field/change', () => activeMode === 'onChange' || activeMode === 'all')
      .otherwise(() => false);

    if (!shouldValidate) return;

    // 2. 执行逻辑
    const validateOp = api.actions.validate(ctx.payload.path);

    if (actionType === 'field/change') {
      // 在 Native Mode 中手动调用防抖工具或复用 DSL 算子
      yield* api.ops.debounce(config.debounce, validateOp);
    } else {
      yield* validateOp;
    }
  })
});
```

### 2.3 数组操作逻辑 (Array Logic)

涉及对 `values` 的深层修改，使用 `api.ops.edit` (基于 Mutative) 是最标准的方式。

```typescript
api.rule({
  name: 'ArrayOperations',
  trigger: api.on.actionType('array/*'),
  do: api.pipe(
    // 1. 原子化更新 Values (使用 Draft 编辑模式)
    api.ops.edit((draft, ctx) => {
      const { path, value, index, indexA, indexB, from, to } = ctx.payload;
      const arr = get(draft.values, path);
      if (!Array.isArray(arr)) return;

      switch (ctx.action.type) {
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
    }),
    
    // 2. 标记 Dirty
    api.ops.set(s => s.ui.meta.isDirty, true),
    
    // 3. 触发校验
    api.ops.actions.validate(ctx => ctx.payload.path)
  )
});
```