# TanStack Form 深度调研

数据来源：官方文档 https://tanstack.com/form/latest/docs/overview 及其 Philosophy、Basic Concepts、Arrays 等章节。

## 封装理念 / 设计哲学
- 单一统一 API：倾向提供一套 API 贯穿全部场景（而不是拆成多套入口），学习曲线集中但换来一致性。
- 灵活但可配置：验证支持按事件粒度配置（onMount/onChange/onChangeAsync Debounce/onBlur/onSubmit/onDynamic/onServer），字段/表单级都有钩子。
- 完全受控（Controlled）：表单状态由库托管、与 DOM 解耦，可用于 React Native/Three.js 等，便于条件渲染和调试。
- 零显式泛型：默认值驱动类型推断，不需要在 `useForm<MyForm>()` 传泛型。
- “以库包库”：推荐用 `createFormHook` 在设计系统里二次封装，输出自家 Hook/组件，减少重复样板。

## 入门心智模型
- Form 实例：`useForm` 返回的对象，暴露 store、`Field` 组件、`Subscribe` 组件、`handleSubmit` 等。与 UI 解耦，专注状态和动作。
- 状态来源：`defaultValues`（也可通过 `formOptions` 预设），从中推导字段类型，无需泛型。
- Field 绑定：通过 `<form.Field name="path">` 绑定路径，render prop 提供 `field`，含 `state`、`handleChange`、`handleBlur` 等。
- 提交流程：在 `<form>` 中阻止默认事件后调用 `form.handleSubmit()`；Form 层的 `onSubmit` 由 `useForm` 传入。
- 路径/嵌套：使用字符串路径 + `DeepKeys`/`DeepValue` 来定位嵌套或数组字段，如 `people[0].name`。

## 核心特性
- 框架无关 + 适配器：核心库 + React/Vue/Angular/Solid/Lit/Svelte 适配包，对应 `@tanstack/<framework>-form`。
- Headless + 受控：不绑定 UI，状态集中在内部 store，方便适配任意组件体系。
- 强类型推断：从 `defaultValues` 推出字段类型；提供 `DeepKeys`/`DeepValue` 等类型工具。
- 验证体系：同步/异步并存，支持防抖 + 取消；字段/表单级 validators 可返回任意对象作为错误；支持 Standard Schema（Zod/Valibot/ArkType/Yup）。
- 细粒度订阅：`useStore(form.store, selector)` 与 `form.Subscribe` 允许以 selector 订阅，控制渲染颗粒度。
- 字段元信息：`isTouched/isDirty/isPristine/isBlurred/isDefaultValue` 持久化脏值模型，适合提示/样式。
- 数组字段：`<form.Field mode="array">` 提供 `pushValue` 等操作，子字段路径用下标。
- 监听与副作用：字段 `listeners` 支持 onChange/onBlur 等触发侧效；Form 级支持 onMount/onDynamic/onServer。
- 可复用封装：`formOptions` 复用默认值/通用配置，`createFormHook` 产出预绑定 Hook/组件；有 Devtools/Debug 辅助。

## 状态与元信息
- FormState 关键字段：`values`、`errorMap`、`meta`、`canSubmit`、`isSubmitting` 等；`form.store` 为可订阅源。
- FieldState 关键字段：`state.value`、`state.meta`（isTouched/isDirty/isPristine/isBlurred/isDefaultValue/isValid/isValidating/errors）。
- 脏值策略：采用“持久化 dirty”，一旦改过即 dirty；若要非持久化，可用 `!isDefaultValue` 计算。

## 验证模型
- 支持的时机：onMount/onChange/onChangeAsync（可配置 debounceMs）/onBlur/onSubmit/onDynamic/onServer。
- 位置：可在 Field 上写 `validators`，也可在 Form 级写 `validators` 统一处理。
- 签名：`({ value, fieldApi, formApi }) => string | object | void | Promise<...>`；返回 falsy/undefined 表示校验通过。
- 异步：内建取消/防抖，常用于远程唯一性校验。
- Schema 支持：直接传 Standard Schema（如 Zod 对象）到 `validators`，库会解码并产出错误。

## 订阅与性能
- 推荐用 `useStore(form.store, selector)` 或 `<form.Subscribe selector>`，只订阅必要切片，减少重渲染。
- 不建议用 `useField` 做大范围订阅；Field render prop 已涵盖字段 UI 场景。
- selector 未提供时会全量订阅，引发多余渲染，实战应显式传 selector。

## 数组与动态字段
- 声明：`<form.Field name="people" mode="array">`，在 render 中 map `field.state.value`，子字段用路径 `people[${i}].name`。
- 操作：使用 `field.pushValue(...)` 等方法新增项；删除/清空可用 `form.deleteField(path)`、`form.clearFieldValues(path)` 等 FormApi 方法。
- 提交：默认 values 中会包含数组结果，结合 `canSubmit`/`isSubmitting` 控制按钮。

## 典型使用流程（React）
1) 安装：`pnpm add @tanstack/react-form`（其他框架对应包名相同）。
2) 预设配置（可选）：`const formOpts = formOptions({ defaultValues })`。
3) 创建实例：`const form = useForm({ ...formOpts, onSubmit: async ({ value }) => {/*...*/}, validators })`。
4) 渲染字段：`<form.Field name="firstName" validators={{ onChange, onChangeAsync, onBlur }}>{field => <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} onBlur={field.handleBlur} />}</form.Field>`。
5) 订阅状态：`<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>...</form.Subscribe>`；或 `useStore(form.store, sel)`。
6) 数组场景：`<form.Field name="people" mode="array">{(field) => field.state.value.map((_, i) => <form.Field key={i} name={`people[${i}].name`}>{...}</form.Field>)}</form.Field>`，用 `field.pushValue` 新增。
7) Schema 校验：`validators: { onChange: z.object({ age: z.number().gte(13, '...') }) }`，字段级也可单独传 schema/函数。
8) 组件化封装：通过 `createFormHook` 生成 `useAppForm/withForm`，在设计系统里预设常用 validators、布局和按钮。

## 对我们现有 form 设计的启发
- 强调“受控 + headless + 细粒度订阅”与我们 effect/Stream 的理念相近，可对齐：将 store/订阅/校验拆出 UI。
- 校验时机的细粒度配置、异步防抖/取消可借鉴为 DSL/约束的一部分。
- `createFormHook` 的“二次封装”思路适合我们定义平台级预设（带 Layer/Env 的 Hook 组合）。
- 持久化 dirty 模型与 `isDefaultValue` 组合的状态设计，可复用到我们元信息设计。 
