# Effect Form

一个基于 Effect-TS 的高性能、类型安全、Headless 表单库。

## 设计哲学

**“小事随社区，大事坚持 Effect”**

我们致力于构建下一代表单解决方案，融合了 Effect 的底层强大能力与 React 社区的最佳实践。

### 1. 大事坚持 Effect (The Core)

在核心架构、状态管理和并发模型上，我们坚持 **Effect-First**：

- **Schema-First**: 原生集成 `@effect/schema`，类型推导与运行时校验合二为一。
- **Stream-Driven**: 使用 `Stream` 处理所有状态变更、校验流、防抖和竞态问题，而非 `useEffect`。
- **Structured Concurrency**: 利用 `Scope` 自动管理资源生命周期，杜绝内存泄漏。
- **Platform Agnostic**: 核心逻辑 (`makeFormStore`) 纯粹且独立，可在 Node.js/浏览器/React Native 任意环境运行测试。

### 2. 小事随社区 (The Interface)

在 API 设计和开发者体验 (DX) 上，我们致敬并采纳社区经过验证的**最佳实践**：

- **Headless & Performance**: 借鉴 **TanStack Form** 的理念，采用 Headless 架构与细粒度订阅 (`useField`)，实现极致渲染性能。
- **Familiar API**: 借鉴 **React Hook Form** 的 API 风格 (`register`, `handleSubmit`)，降低学习和迁移成本。
- **Component-First**: 提供 `<Field>` 组件模式，简化复杂表单的嵌套与状态绑定。

### 3. 自由特色 (The Freedom)

- **Escape Hatch**: 始终暴露原始 `form.source` (Effect Store)，允许开发者利用 Effect 的强大能力进行复杂的逻辑编排与组合。
- **Dependency Injection**: 天然支持 Effect `Layer` 注入，轻松集成 API Client、Logger 或其他服务。

---

## 路线图 (Roadmap)

- [x] **Core**: 基于 `SubscriptionRef` 和 `Stream` 的响应式内核
- [x] **Validation**: 集成 `@effect/schema` 与 `ArrayFormatter`
- [ ] **Performance**: 重构为 Headless 架构，实现 `useField` 细粒度订阅
- [ ] **DX**: 实现 `register` 与 `handleSubmit` 语法糖
- [ ] **Components**: 封装 `<Field>` 与 `<Form>` 组件
- [ ] **Features**: 支持 `touched`, `dirty` 状态与 `onBlur` 校验策略
