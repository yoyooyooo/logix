---
title: Domain Packages
status: living
version: 2
---

# Domain Packages

## 目标

给除 Form 之外的领域包，在新体系下定义一套统一规划。

当前先覆盖：

- `@logixjs/query`
- `@logixjs/i18n`
- `@logixjs/domain`

## 总原则

### 1. 领域包不能再长第二套运行时

所有领域包都必须降到同一个核心主线：

- `Module`
- `Logic`
- `Program`
- `Runtime`

领域包可以有自己的 facade，但不能拥有：

- 第二套 runtime
- 第二套 DI 模型
- 第二套事务模型
- 第二套调试事实源

### 2. 领域包必须只表达领域语义

领域包的职责是：

- 补领域模型
- 补领域 DSL
- 补领域默认行为

领域包不负责：

- 重新定义主链
- 重新定义宿主集成方式
- 引入新的公开相位对象

### 3. 旧名字不自动继承

这轮重构不默认继承任何旧名字。

尤其不默认继承：

- `Query.make`
- `I18nModule`
- `CRUDModule`
- `controller`

判断标准只有一个：

- 它是否仍然是最符合北极星的名字和形态

如果不是，就直接重命名或删除，不保留“为了熟悉而继续沿用”的空间。

### 4. controller 只做便利层，不做第二语义面

领域包若暴露 `controller`，它的定位必须是：

- 对 actions / queries / common commands 的便利封装

它不应变成：

- 绕过主链的第二组核心 API
- 与模块状态/动作并行的第二语义面

### 5. 一包只选一个主输出形态

领域包应明确自己主要是哪一类：

- service-first
- program-first

不要同时 blessed 多种等价主输出。

这里明确排除 `module-first`。

原因：

- `Module` 已经是核心主链的一等对象
- 领域包若再把“module-first”当主输出，会重新长出第二组相位心智
- 领域包更适合补 service 能力或 program kit，而不是再占用核心相位名词

## 包级分类

### A. service-first

适合：

- i18n
- logger
- auth session
- feature flags

特点：

- 主体是服务能力
- 可选带一个 projection program

### B. program-first

适合：

- query
- form
- 强行为模板化的 CRUD / domain kits

特点：

- 包内已经固定了主要 state、initial、默认 logic
- 对业务作者而言，拿来就应该能挂进 runtime tree

## Query 包规划

### 定位

`@logixjs/query` 是一个 **program-first** 领域包。

它负责：

- 参数驱动的查询状态
- 结果快照写回模块 state
- 竞态语义
- 失效 / 刷新 / 缓存语义

它不负责：

- 引入第二套 cache truth
- 引入第二套 runtime

### 当前建议

- 不预设 `Query.make` 必须继续保留
- 先把 Query 视为“resource program kit”
- 它的默认公开输出应直接是 program-first 形态
- 它内部必须降到同一个 `Module + Program + Logic` 主线

### 保留的能力

- `Query.Engine`
- `Query.TanStack`
- invalidation / refresh helper
- 结果快照进入 state

### 收紧方向

- Query 的 cache 仍然必须能投影回模块 state
- `Engine` 继续作为 capability / middleware / integration layer，不反向定义主链
- Query 若保留便利层，只能是 helper，不允许形成与 actions / state 并行的第二语义面
- Query 包默认不再讲“查询模块”，而讲“查询 program kit”

### 当前一句话结论

Query 在新体系下应被重塑成 resource-oriented 的 program kit，而不是继续维持一个看起来独立成体系的 Query 世界。

## I18n 包规划

### 定位

`@logixjs/i18n` 是一个 **service-first** 领域包。

它负责：

- i18n driver 注入
- message token 语义
- 可选的 snapshot 投影

### 当前建议

- `I18n.layer(driver)` 继续作为默认主入口
- `token(...)` 继续作为稳定的可序列化翻译锚点
- 不预设 `I18nModule` 必须继续存在
- 若保留 projection，也应降到明确的辅助投影层，而不是默认主入口

### 默认消费方式

- 普通业务逻辑优先通过 `services.i18n` 消费
- 只有在明确需要 fixed root 解析域时，才走 root/global 语义

### 收紧方向

- 不把 `I18nModule` 推成默认入口
- 不把 root/global 解析语义塞进日常主写法

### 当前一句话结论

I18n 的主身份应坚定收敛为“服务能力 + token contract”；任何 module/projection 形态都只能是辅助层。

## Domain 包规划

### 定位

`@logixjs/domain` 是一个 **pattern-kit** 包。

它负责：

- 领域模板
- 业务模式 kit
- 例如 CRUD 一类高复用 domain abstraction

### 当前建议

- 包内 kit 统一走 program-first 方向
- 不预设 `CRUDModule` 这个名字继续保留
- 任何带 `Module` 的领域名字，都默认视为待删除或待重命名候选
- 语义必须重新对齐到新主线，不再暗示“第二套管理模型”

### 保留的能力

- 默认 state / initial / default logic
- 显式 `services.api`
- 少量 helper

### 收紧方向

- `controller` 若继续存在，只能是 helper，不得成为主叙事
- 领域 kit 不再暗示“超出 Module / Program 的额外相位对象”
- 调用方应清楚知道：拿到的是一份领域 program kit，而不是第二套 runtime abstraction
- 包名可以继续叫 `domain`，但对外默认讲的是若干 pattern kits，不讲“领域模块体系”

### 当前一句话结论

Domain 包在新体系下应被重构成一组 program-first 的 pattern kits；`CRUDModule` 这类旧命名不应自动继承。

## 未来领域包的统一准入规则

后续若继续长新的领域包，默认要先回答这几个问题：

### 1. 它是 service-first / program-first 哪一种

必须明确选一个主输出形态。

### 2. 它是否引入了第二真相源

如果有：

- 第二套 runtime
- 第二套 cache truth
- 第二套调试事实源

默认拒绝。

### 3. 它的 controller 是否只是便利层

如果 controller 开始承载第二语义面，必须回退重设计。

### 4. 它是否能完全降到主链

必须能降到：

- `Module`
- `Logic`
- `Program`
- `Runtime`

### 5. 它是否能给出可反射静态 contract

领域包不能只给黑盒便利函数。

## 当前一句话结论

Form 之外的领域包，在新体系下应更激进地重塑为：Query 是 program-first 的 resource kit，I18n 是 service-first 的 token/service 包，Domain 是 program-first 的 pattern-kit 集合；旧名字和旧壳层都不自动继承。
