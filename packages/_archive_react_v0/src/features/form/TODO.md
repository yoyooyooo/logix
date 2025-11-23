# TODO（对照设计文档待补能力）

- [x] **Core**: 基于 `SubscriptionRef` 和 `Stream` 的响应式内核
- [x] **Validation**: 集成 `@effect/schema` 与 `ArrayFormatter`
- [x] **Performance**: 重构为 Headless 架构，实现 `useField` 细粒度订阅
- [x] **DX**: 实现 `register` 与 `handleSubmit` 语法糖
- [x] **Components**: 封装 `<Field>` 组件
- [x] **Features**: 支持 `touched`, `dirty` 状态与 `onBlur` 校验策略
- [x] **Deep Path**: 支持嵌套对象路径 (`user.name`) 更新与校验
- [x] **Field Array**: 支持数组增删改查 (`useFieldArray`)
- [x] **Safety**: 消除 `null` control，修复运行时异步安全问题

## 待办事项

- [ ] **Async Validation**: 支持异步校验规则（如服务端查重）
- [ ] **Form Provider**: 提供 Context 版本的 API 以避免透传 control
- [ ] **Virtual List**: 针对超长列表的性能优化
- [ ] **DevTools**: 开发调试工具

异步校验的缺失 (Lack of Async Validation)
当前的 validate 函数是同步的。虽然 TODO.md 中提到了异步校验，但这是表单库的一个关键功能（例如，检查用户名是否已存在）。在 Effect-TS 的模型下，实现这一点并不困难（例如，在 validate 中返回一个 Effect.Effect<boolean, ValidationError>），但这是目前方案的一个明显短板。

control 的手动传递 (Manual Prop-drilling of control)
目前的设计要求在 useField, useFieldArray, <Field> 等地方手动传入 useForm 返回的 control 对象。当表单层级很深时，这会导致繁琐的 "prop drilling"。TODO.md 中提到的 Form Provider (基于 React Context) 是解决这个问题的标准方案，也是提升体验的关键一步。

useForm 的初始化逻辑 (Initialization Logic in useForm)
useForm 内部的 useEffect 包含了创建 scope、runtime 和 store 的复杂逻辑，并且依赖项包括了 initialValues 和 options.debounce，这会导致在这些值变化时整个表单 store 被销毁和重建。虽然 mode 的变更被单独处理了，但对于 initialValues 的动态变化（例如，从服务器加载数据后填充表单），当前的处理方式是毁灭性的。更理想的方案是提供一个 reset(newValues) 方法，在 store 内部处理状态重置，而不是重建整个 store。
