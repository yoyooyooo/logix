# Data Model: 029 国际化接入与 `$.root.resolve(Tag)` 语法糖

**Branch**: `029-i18n-root-resolve`  
**Source Spec**: `specs/029-i18n-root-resolve/spec.md`  
**Source Plan**: `specs/029-i18n-root-resolve/plan.md`  
**Source Research**: `specs/029-i18n-root-resolve/research.md`

> 作用：以“实体/关系/不变量”视角描述本特性的最小数据模型，帮助 core/react/traits 在同一事实源下对齐实现与测试。

---

## 1. Root 解析语法糖（Logic `$`）

### 1.1 Root Provider（非进程级）

```ts
type RuntimeTreeId = string // 可诊断锚点（不要求全局唯一，但必须可复现/可定位）

type RootProvider = {
  readonly treeId?: RuntimeTreeId
  readonly context: unknown // effect Context.Context<any>
}
```

不变量：

- Root provider 与 Runtime Tree 绑定：同进程多 tree 必须隔离。
- root/global 解析不受局部 override 影响。

### 1.2 RootResolve API（对内/对外语义）

```ts
type RootResolveMode = "global"

type RootResolveRequest = {
  readonly mode: RootResolveMode
  readonly tokenId?: string
  readonly entrypoint: "logic.root.resolve" | "logic.$.root.resolve"
}
```

> 说明：实现上 `$.root.resolve` 可以直接复用 `Root.resolve`（entrypoint 可能仍显示为 `logic.root.resolve`）；数据模型允许区分两者以提升诊断精度。

---

## 2. 国际化领域特性（I18n Service）

### 2.1 外部实例（I18nDriver 最小形状）

```ts
type I18nDriver = {
  readonly language: string
  readonly isInitialized?: boolean
  readonly t: (key: string, options?: unknown) => string
  readonly changeLanguage: (language: string) => Promise<unknown> | unknown
  readonly on: (event: "initialized" | "languageChanged", handler: (...args: any[]) => void) => unknown
  readonly off: (event: "initialized" | "languageChanged", handler: (...args: any[]) => void) => unknown
}
```

约束：

- Logix 只规定外部实例的最小形状（I18nDriver）：i18next 风格实例可直接作为注入值；其他引擎可实现同等接口。
- 正确性语义不得依赖进程级全局单例；必须由 runtime tree 注入提供（多 tree 必须隔离）。

### 2.2 I18nSnapshot（最小可订阅快照）

```ts
type I18nInitState = "pending" | "ready" | "failed"

type I18nSnapshot = {
  readonly language: string
  readonly init: I18nInitState
  readonly seq: number // 单调递增：language/init 任一变化都必须 +1
}
```

不变量：

- `seq` 单调递增且可复现（同一 tree 内不依赖随机数）。
- 快照必须 Slim、可序列化（允许进入诊断事件载荷）。

### 2.3 TranslateMode（等待/不等待）

```ts
type TranslateMode = "now" | "waitReady"
```

语义：

- `now`：不等待 ready；未就绪时返回可展示回退值；
- `waitReady`：等待 init=ready 后再翻译；默认等待上限 5 秒（支持调用方覆盖）；若 init=failed 或超过上限，则返回可预测降级（不无限等待）。

### 2.4 Message Token（可延迟翻译的消息描述）

为了“可回放 + Slim + 稳定对比”，token 推荐使用受限结构：

```ts
type JsonPrimitive = null | boolean | number | string

type I18nTokenOptions = Readonly<Record<string, JsonPrimitive>>

type I18nMessageToken = {
  readonly _tag: "i18n"
  readonly key: string
  readonly options?: I18nTokenOptions
}
```

不变量（预算示例，最终以 `contracts/message-token.md` 为准）：

- `key`/`options` 长度/体积有上限（早期可 soft，后续可升级为 hard）；
- `options` 只允许 JsonPrimitive（禁止嵌套对象/数组/函数等不可序列化值）；
- `options` 必须被 canonicalize（去掉 `undefined`，并按 key 字典序重建），保证稳定对比/稳定序列化；
- `options` 不允许携带语言冻结字段（例如 `lng` / `lngs`），避免 token 把语言“写死”。

### 2.5 I18n Service Contract（最小能力集合）

```ts
type I18nService = {
  readonly instance: I18nDriver
  readonly snapshot: unknown // effect SubscriptionRef<I18nSnapshot> 或等价可订阅引用

  // 非阻塞：永远返回可展示字符串（未就绪时回退）
  readonly t: (key: string, options?: I18nTokenOptions) => string

  // 等待就绪：返回最终字符串；失败走可预测降级（不无限等待）
  readonly tReady: (key: string, options?: I18nTokenOptions, timeoutMs?: number) => unknown // Effect<string, never, ...>

  // 请求切换语言：以当前 tree 注入的外部实例为准，并通过 snapshot 作为单一变化信号对外传播
  readonly changeLanguage: (language: string) => unknown // Effect<void, never, ...>

  // 纯函数：构造可回放 token（canonicalize；预算可先 soft 再升级 hard）
  readonly token: (key: string, options?: I18nTokenOptions) => I18nMessageToken
}
```

---

## 3. 关键关系与推荐用法（与 strict 语义协同）

### 3.1 strict vs root

- strict（`$.use`）：用于“实例/父子 imports”关系的解析；缺失必须失败；
- root（`$.root.resolve`）：用于“全局单例”能力（如 I18n 服务、Auth、全局配置），不受局部 override 影响。

### 3.2 语言切换的传播策略

- 推荐：状态里存 token，UI 渲染时用当前语言翻译；UI 通过 i18n 自身机制或订阅 `I18nSnapshot` 触发更新；
- 可选：若必须把最终字符串落在 state，必须显式订阅 `I18nSnapshot` 并触发重算（不隐式魔法）。
