---
title: I18n Catalog Registration Contract
status: consumed
owner: i18n-catalog-registration
target-candidates:
  - docs/ssot/runtime/08-domain-packages.md
  - docs/proposals/form-rule-builtin-i18n-catalog-contract.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# I18n Catalog Registration Contract

## 目标

冻结 `@logixjs/form/locales` 这类 locale asset 被应用接入 `@logixjs/i18n` 时的注册边界。

这一轮只回答：

- locale asset 的注册 owner 归谁
- 注册动作发生在哪一层
- 跨领域 default catalogs 的 collision law 是什么
- app override layer 的 merge law 是什么
- locale bucket key 归谁解释
- local helper 的合法边界是什么

这一轮不处理：

- i18n render boundary exact contract
- driver adapter 的具体实现
- locale loading / lazy loading / code splitting 策略
- per-locale subpath 是否继续细分

## 当前问题

我们已经在 [form-rule-builtin-i18n-catalog-contract.md](./form-rule-builtin-i18n-catalog-contract.md) 里收住：

- `@logixjs/form/locales` 会导出 `zhCN`、`enUS` 这类 plain catalogs
- 它们只是 locale assets

但还缺最后一段主线：

- 用户拿到 `import { zhCN, enUS } from "@logixjs/form/locales"` 以后，应该如何接进 i18n

如果这段不冻住，就会继续有四种漂移：

1. app-side merge law 漂移
2. i18n core 额外发明 `registerCatalogs(...)`
3. form 再长出 `installLocales(...)`
4. app-local bootstrap utility 偷带自己的 mapping / precedence policy

## 已冻结前提

当前 proposal 只能建立在下面这些前提上：

1. `@logixjs/i18n` 是 service-first 包
2. `@logixjs/i18n` 当前 surviving root 只保留 `I18n / I18nTag / I18nSnapshotSchema / token contract exports`
3. i18n service 继续只持有 `snapshot / changeLanguage / render / renderReady`
4. 领域包若要承接用户文案，默认直接复用 i18n token contract，不复制第二消息合同
5. `@logixjs/form/locales` 只导出 locale assets，不定义 render API
6. root surface 不该为了 catalog registration 再长新 noun

## 要裁的 5 件事

### 1. registration owner 归谁

候选：

1. app bootstrap owner
2. i18n core owner
3. form owner

当前判断：

只应接受候选 1。

原因：

- 资源表最终属于具体 driver 的初始化参数
- i18n core 当前只定义 token/render contract，没有资源注册模型
- form 只拥有自己的 locale assets，不拥有应用的 driver lifecycle

### 2. registration 动作发生在哪

候选：

1. driver 构造前，作为资源表 merge
2. `I18n.layer(...)` 内部再做二次注册
3. runtime 启动后，通过 service 动态注册

当前判断：

优先固定候选 1。

原因：

- 这是唯一不扩张 i18n service contract 的路径
- `I18n.layer(driver)` 当前只吃 driver，不吃 resources
- runtime 启动后动态注册会把 snapshot/render 之外再长一条 mutable configuration path

### 3. 跨领域 default catalogs 的 collision law 是什么

候选：

1. 按 merge 顺序决定谁覆盖谁
2. default domain catalogs 之间必须稳定不冲突；冲突视为 authoring error

当前判断：

采用候选 2。

原因：

- default domain catalogs 若依赖 merge 顺序，语义来源就会被偷偷外移到应用 bootstrap 的对象顺序
- 领域包自己持有稳定 key namespace，才是真正可组合的 contract

### 4. app override layer 的 merge law 是什么

候选：

1. default domain catalogs 覆盖 app catalog
2. app catalog 覆盖 default domain catalogs
3. key 冲突直接 fail-fast

当前判断：

采用候选 2。

原因：

- default domain catalogs 只是默认文案
- 应用必须有覆盖领域默认文案的能力
- 对产品语气、行业术语、品牌措辞的最终裁定权应停在应用

### 5. locale bucket key 归谁解释

候选：

1. `zhCN/enUS` 直接决定 driver 的 bucket key
2. 应用负责把 `zhCN/enUS` 映射到 driver 自己的 locale key

当前判断：

采用候选 2。

原因：

- 不同 driver 对语言 key 的约定不同，例如 `en`、`en-US`、`zh`、`zh-CN`
- `zhCN/enUS` 更适合作为 export noun，不适合作为跨 driver 的规范 key
- bucket key 若由 form 或 i18n core 固定，会把 driver adapter policy 偷渡进 core contract

这里继续补一条：

- bucket mapping law 的唯一 owner 也固定停在 app bootstrap
- application-owned bootstrap utility 只能机械承载应用已经决定好的 key 映射，不得拥有独立 policy

## 当前 adopted candidate

当前采用下面这组裁决：

1. catalog registration、merge order、bucket mapping 的唯一 owner 固定为 app bootstrap
2. registration 动作固定发生在 driver 构造前
3. `@logixjs/form/locales` 继续只导出 plain locale assets
4. `@logixjs/i18n` core 不新增 `registerCatalogs(...)`、`withCatalogs(...)`、`catalogLayer(...)`
5. default domain catalogs 必须占有稳定且互不冲突的 key namespace
6. cross-domain default catalog 冲突视为 authoring error，不依赖 merge 顺序消解
7. app override layer 的 precedence 固定为 last-wins
8. local helper 只允许机械封装，不能拥有独立 mapping / precedence policy
9. portability 继续是 non-goal；若某 driver 需要 value-shape transform，只能停在 app-local pre-layer adapter
10. examples/tutorial 只教“merge resources then pass driver into `I18n.layer(driver)`”

## exact candidate

### registration law

当前建议固定为：

```ts
import { I18n } from "@logixjs/i18n"
import { zhCN as formZhCN, enUS as formEnUS } from "@logixjs/form/locales"

const driver = createAppI18nDriver({
  resources: {
    en: {
      ...domainDefaultsEn,
      ...appEn,
    },
    zh: {
      ...domainDefaultsZh,
      ...appZh,
    },
  },
})

const i18nLayer = I18n.layer(driver)
```

这里的 `createAppI18nDriver(...)` 只表示 application-owned driver factory placeholder。
它不构成 `@logixjs/i18n` 或 `@logixjs/form` 的新 noun。

这里冻结的是：

- registration 在 driver 构造前完成
- `I18n.layer(driver)` 不接 catalogs
- default domain layer 先闭合，再由 app override layer 收尾

其中：

```ts
const domainDefaultsEn = {
  ...formEnUS,
  ...otherDomainEn,
}
```

只有在 key namespaces 互不冲突时，这种聚合才合法。
如果两个领域包默认 catalogs 冲突，视为 authoring error，不再靠对象顺序偷偷解决。

### merge precedence

当前固定为：

```ts
{
  ...formCatalog,
  ...appCatalog,
}
```

含义：

- default domain catalogs 提供默认值
- app catalog 拥有最终覆盖权

### plain asset boundary

这轮不再定义新的 generic catalog noun。

这里只冻结负面边界：

- locale asset 不携带 locale bucket key
- locale asset 不携带 driver metadata
- locale asset 不携带 registration hook
- locale asset 不携带 render helper

asset exact shape 继续回指导出该 asset 的领域包 contract，例如：

- [form-rule-builtin-i18n-catalog-contract.md](./form-rule-builtin-i18n-catalog-contract.md)

### bucket mapping law

当前固定为 app bootstrap owner：

```ts
import { zhCN, enUS } from "@logixjs/form/locales"

const resources = {
  "en-US": {
    ...enUS,
    ...appEnUS,
  },
  "zh-CN": {
    ...zhCN,
    ...appZhCN,
  },
}
```

export noun 和 bucket key 不再绑死。

如果某个应用想写 local helper，它也只能是这种 mechanical lowering：

```ts
const resources = mapCatalogBuckets({
  "en-US": enUS,
  "zh-CN": zhCN,
})
```

但这里的 helper：

- 只能停在 app-local 或 app-owned bootstrap utility
- 不拥有 bucket mapping policy
- 不拥有 precedence policy
- 不进入 `@logixjs/i18n` 或 `@logixjs/form` 的公共 contract

### portability non-goal

这轮不保证 locale assets 对任意 driver 都可直接注册。

当前只冻结：

- owner
- timing
- collision law
- app override precedence
- bucket mapping law

如果某 driver 需要额外的 value-shape transform，只能停在 app-local pre-layer adapter，不能抬成 `@logixjs/i18n` 或 `@logixjs/form` 的公开 API。

## 为什么这样收

### 1. 为什么不在 i18n core 增加注册 helper

因为 i18n core 当前没有资源表 contract。

它只知道：

- token
- snapshot
- render
- changeLanguage

如果 core 现在新增 `registerCatalogs(...)`，就会把 driver-specific resource model 抬成新的核心语义。

### 2. 为什么不让 form 提供 install helper

因为 form 只拥有 locale assets 的内容 owner 身份。

一旦 form 开始提供 `installLocales(driver)` 一类 helper，就会同时拿到：

- driver adapter policy
- merge precedence policy
- locale bucket policy

这会越过 form 的 owner 边界。

### 3. 为什么 app override 必须赢

因为 form defaults 只是默认值。

应用经常需要：

- 改产品语气
- 改行业术语
- 改不同 locale 的细节措辞

如果 form defaults 覆盖 app，就等于把领域包默认文案变成了强绑定文案。

### 4. 为什么 cross-domain default catalog 冲突不能靠 merge 顺序解决

因为 default domain catalogs 是领域包自己的默认语义资产。

如果两个领域包默认 catalogs 的冲突需要靠：

- spread 顺序
- helper 参数顺序
- adapter 内部顺序

来决定谁生效，那么真正的 owner 就从领域包 contract 滑到了应用 bootstrap 的对象顺序。

这在 `zero-unresolved` 下不够稳定。

### 5. 为什么 bucket key 不冻结

因为 bucket key 是 driver 语义，不是 token 语义。

`zhCN/enUS` 只是 export noun，方便人类理解和按语言包分类。

把它直接冻结成 runtime registration key，会把 driver policy 和 asset identity 混成一个概念。

## 当前拒绝的方向

当前继续拒绝：

- `I18n.registerCatalogs(...)`
- `I18n.withCatalogs(...)`
- `I18n.catalogLayer(...)`
- `Form.installLocales(...)`
- `Form.locales.install(...)`
- core service 在 runtime 启动后动态注册 catalogs
- form catalog 覆盖 app catalog
- cross-domain default catalog 依赖 merge 顺序静默覆盖
- `zhCN/enUS` 自动决定 runtime bucket key
- application-owned bootstrap utility 拥有自己的 bucket mapping policy
- application-owned bootstrap utility 拥有自己的 precedence policy

## 当前影响面

若采用本 proposal，后续文档和 examples 至少要统一到：

- `docs/proposals/form-rule-builtin-i18n-catalog-contract.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/internal/form-api-tutorial.md`
- i18n 示例与 form 示例里的 bootstrap 片段

如果后续真的实现 `@logixjs/form/locales`，examples 需要直接展示：

- app bootstrap merge
- cross-domain default catalogs 先闭合
- app override precedence
- bucket mapping 仍由应用掌控

## reopen gate

后续只有同时满足下面条件时，才允许继续扩：

1. 不把 i18n core 扩成资源注册 owner
2. 不把 form 扩成 driver adapter owner
3. 不引入 runtime 后注册这条第二配置路径
4. 若要新增 helper，必须证明它只做 application-owned 的 mechanical lowering，不引入新的 policy owner
5. 若要冻结 bucket key，必须先证明跨 driver 都能接受同一 key law
6. 若要放宽 cross-domain default collision，必须先证明不会把 owner 滑回 merge order

## 当前一句话结论

当前最稳的注册 contract 是：

- `@logixjs/form/locales` 只导出 plain catalogs
- application bootstrap 是 registration、merge order、bucket mapping 的唯一 owner
- cross-domain default catalogs 必须先按稳定 namespace 闭合，冲突视为 authoring error
- 应用在 driver bootstrap 阶段把 domain defaults 和 app overrides merge 进 resources
- app overrides last-wins
- `I18n.layer(driver)` 继续只吃 driver

## 去向

- 2026-04-17 已消化到：
  - [08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
  - [form-rule-builtin-i18n-catalog-contract.md](./form-rule-builtin-i18n-catalog-contract.md)
