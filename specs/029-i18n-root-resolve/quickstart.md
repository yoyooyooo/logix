# Quickstart: 029 国际化接入与 `$.root.resolve(Tag)`

> 本 quickstart 只演示“怎么接入 + 怎么用 + 怎么在语言变化下保持正确”，不追求完整 API 细节；最终以 `contracts/*` 为准。

## 0. 你需要记住的四句话

1. **strict 默认**：`$.use(...)` 只解析当前实例 scope（imports/局部）——缺失就报错，不要指望它拿到全局。
2. **root 显式**：要拿全局单例（I18n/Auth/Config），用 `yield* $.root.resolve(Tag)`（或 `Logix.Root.resolve(Tag)`）。
3. **状态里优先放 token**：表单错误/提示等放 message token，最终字符串在展示边界生成。
4. **异步初始化有两档**：多数场景用“不等待”翻译立即回退；少数场景用“等待就绪”拿最终文案（`tReady` 默认等待上限 5 秒，可覆盖）。

## 1. 注入外部 i18n 实例（每棵 Runtime Tree 一份）

目标：UI/业务代码继续用你熟悉的 i18n 实例；Logix 侧通过注入拿到同一个实例（保证多 tree 可隔离）。

推荐模式（概念形态）：

- 宿主创建（或异步初始化）外部 i18n 实例；
- 从 `@logix/i18n` 导入 `I18n`，并在创建 runtime tree 时把 `I18n.layer(instance)` 合并进 root layer；
- 这样 Module Logic 就能通过 root 入口读取该服务。

> 说明：本特性只规定“注入契约”，不规定你如何加载语言包/连接平台。

### 1.1 React 集成示例（i18next + react-i18next）

> 目标：**同一个 i18n 实例**同时给 UI（react-i18next）和 Logix（`@logix/i18n`）使用；避免出现“双实例”。

```tsx
import * as Logix from "@logix/core"
import { RuntimeProvider } from "@logix/react"
import { I18n } from "@logix/i18n"
import { Layer } from "effect"
import { createInstance } from "i18next"
import { initReactI18next, I18nextProvider } from "react-i18next"

const i18n = createInstance()

await i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: { "form.required": "Name is required" } },
    zh: { translation: { "form.required": "必填" } },
  },
})

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, I18n.layer(i18n)),
})

export function Root() {
  return (
    <I18nextProvider i18n={i18n}>
      <RuntimeProvider runtime={appRuntime}>
        <App />
      </RuntimeProvider>
    </I18nextProvider>
  )
}
```

### 1.2 可选：i18n 后台异步初始化（不阻塞启动）

如果你的语言包来自外部平台，通常会走“先启动应用、i18n 后台就绪”的流程；本特性支持这种模式（不等待翻译会回退，少数场景再用 `tReady` 等待）。

沿用 1.1 的 imports/Provider，只调整初始化顺序：

```tsx
const i18n = createInstance()
const initI18n = i18n.use(initReactI18next).init(/* ... */)

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, I18n.layer(i18n)),
})

void initI18n
```

## 2. 在 Module Logic 内使用 i18n（不需要 useEffect）

典型场景：Logic 根据业务条件产出提示文案（或 token），并把它挂到 state 供 UI 展示。

推荐：产出 token（可回放），UI 渲染时再翻译：

- `const i18n = yield* $.root.resolve(I18nTag)`
- `I18nTag` 来自 `@logix/i18n`（I18n 领域特性包）
- `const token = i18n.token("form.required", { field: "name", defaultValue: "Name is required" })`
- 把 `token` 写入 state（例如错误树）

示意（只强调“root 显式 + token”两点，不展开模块细节）：

```ts
import { Effect } from "effect"
import { I18nTag } from "@logix/i18n"

const mkRequiredToken = ($, field) =>
  Effect.gen(function* () {
    const i18n = yield* $.root.resolve(I18nTag)
    return i18n.token("form.required", { field, defaultValue: "Required" })
  })
```

### 2.1 在 UI 渲染 message token（示例）

```tsx
import type { I18nMessageToken } from "@logix/i18n"
import { useTranslation } from "react-i18next"

const renderToken = (t: (key: string, options?: any) => string, token: I18nMessageToken) => t(token.key, token.options)

export function FieldErrorView(props: { token: I18nMessageToken }) {
  const { t } = useTranslation()
  return <span>{renderToken(t, props.token)}</span>
}
```

## 3. Toast / 异步流程：需要“最终字符串”时怎么做

多数 toast 不需要随语言变化更新：只要在触发时用当前语言翻译一次即可。

- 不等待（推荐默认）：`i18n.t(key, { ...vars, defaultValue })` → 未就绪时立即回退（不阻塞流程）
- 等待就绪（少数场景）：`yield* i18n.tReady(key, { ...vars, defaultValue }, timeoutMs?)` → 就绪后返回最终文案；失败进入可预测降级（不无限等待）
- `tReady` 默认等待上限 5 秒；可由调用方覆盖等待上限（到达上限也进入回退）。

> 约束：事务窗口禁止 IO；等待就绪属于 Effect 流程边界，不能放在同步 state transaction 闭包里。

## 4. 语言切换后如何“自动更新”

### 4.1 推荐：token + 展示边界翻译

- state 里存 token；
- UI 使用你原有的 i18n 订阅机制（例如 i18next-react 会在 languageChanged 时触发 re-render）；
- re-render 时把 token 翻译成字符串即可自然更新。

另外，如果你需要从 Logix 侧发起“请求切换语言”，优先通过注入的 I18n Service 发起，并确保语言/就绪变化通过 `I18nSnapshot` 作为统一变化信号对外传播。

### 4.2 可选：最终字符串落 state（需要显式重算）

如果你坚持把最终字符串存入 state，那么必须显式订阅 `I18nSnapshot` 的变化，并触发重算（例如派发 action 重新计算）。

这不是默认推荐路径：它会让“语言变化”扩散到业务逻辑里，增加遗漏风险。
