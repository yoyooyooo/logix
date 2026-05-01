---
title: Domain Packages
status: living
version: 15
---

# Domain Packages

## 目标

给除 Form 之外的领域包，在新体系下定义一套统一规划。

当前先覆盖：

- `@logixjs/query`
- `@logixjs/i18n`
- `@logixjs/domain`

Form 已升级为独立子树，完整事实源统一看 [../form/README.md](../form/README.md)；[./06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md) 只保留 form 与 field-kernel 的 boundary。本页只负责 Query、I18n、Domain 与未来领域包统一准入规则。

所有 domain package 继续共享这条硬规则：

- declaration asset 必须降到同一个 `Program.make(...)` 编译边界
- domain package 不得在 runtime 启动阶段再做 declaration merge / build
- domain package 不得在 package root 长出第二套 field authoring
- domain package 不得开放 raw field / field expert escape hatch
- domain package 不得拥有 canonical host family
- domain package 不得拥有 pure projection family
- domain package 不得代持官方 toolkit law

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

尤其不默认继承旧 facade、旧 module-named helper 与旧的 handle helper 命名。

判断标准只有一个：

- 它是否仍然是最符合北极星的名字和形态

如果不是，就直接重命名或删除，不保留“为了熟悉而继续沿用”的空间。

### 4. 句柄 helper 只做便利层，不做第二语义面

领域包若暴露额外句柄 helper，它的定位必须是：

- 对 actions / queries / common commands 的便利封装
- 默认优先收敛到 `commands`
- 必须机械还原到 core host law 与 core handle 语义

它不应变成：

- 绕过主链的第二组核心 API
- 与模块状态/动作并行的第二语义面
- 领域包自有的 canonical React hook family
- 领域包自有的 pure projection family

### 4.1 toolkit 与领域包的关系

官方 `@logixjs/toolkit` 是 cross-domain secondary layer。

它可以：

- 包装 Form / Query / I18n / Domain 的高频姿势
- 提供官方 blessed wrapper、recipe、preset、pattern kit

它不能：

- 抢走领域 owner
- 改写领域 truth
- 把领域包重新拖成 toolkit 的子真相层

因此：

- 领域包继续持有语义与 owner
- toolkit 只持有 DX 组合
- 哪个 helper 应进 core、进 toolkit，先由维护者按 core-first 门禁裁决

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

### 6. 为什么更偏向 program-first

当前主链的目标，不只是可复用，还要让组合规则对人和 Agent 都足够稳定。

如果领域包继续默认输出 `module-first`，业务作者和 Agent 很容易重新走回这些不稳定路径：

- 一个页面直接拼很多定义对象
- 不同复杂度功能长出不同装配姿势
- `Module` 再次被误解成半可运行对象

因此，领域包默认更偏向：

- `service-first`
- `program-first`

这两类输出对人和 Agent 的收益更明确：

- 更容易知道“拿到手的是能力，还是可挂载业务单元”
- 更容易把业务需求映射到固定的装配公式
- 更容易保持 examples、docs、domain kits 和代码生成的一致性
- 更容易保证“React 管 UI，Logix 管逻辑”时，全仓只保留一套宿主映射公式

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
- 对 Agent 而言，拿到的就是可组合的业务单元，不需要再猜它是否还缺装配步骤

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

- Query 视为“resource-oriented program kit”
- 它的默认公开输出直接是 program-first 形态
- 它内部必须降到同一个 `Module + Logic + Program.make(...)` declaration compiler 主线
- package root 当前只保留 `Query.make / Query.Engine`
- `TanStack` 已回收到 query internal owner
- 不再开放 `@logixjs/query/<Concept>` 一类 concept subpath
- query-specific field semantics 统一收进 Query DSL 本身，不另开 helper 家族

### 保留的能力

- `Query.make`
- `Query.Engine`
- `Query.Engine.Resource`
- invalidation / refresh helper
- 结果快照进入 state

package root 约束：

- 只允许暴露服务 program-first 方向的最小表面
- `Query.make(...)` 不再接受 raw field fragment config
- root `Query` 不再保留 raw field helper
- 不再保留任何公开 field helper / expert route

### 收紧方向

- Query 的 cache 仍然必须能投影回模块 state
- `Engine` 继续作为 capability / middleware / integration layer，不反向定义主链
- `Resource` owner 固定在 `Query.Engine.Resource` family landing；`make / layer / keyHash / Snapshot` 只在这条 landing 下继续公开
- `Query.Engine.Resource.layer(...)` 只作为 `Layer` 进入 `capabilities.services` 或 runtime `layer` overlay，不新增 `capabilities.resources`
- Query 若需要更强表达力，默认扩 Query DSL，不回退到 raw field authoring
- Query 包默认不再讲“查询模块”，而讲“查询 program kit”

### 当前一句话结论

Query 在当前体系下已经收口到 `Query.make / Query.Engine` 这条最小 root contract；`Resource` owner 固定在 `Query.Engine.Resource`，`TanStack` adapter 回收到 internal owner，query 继续只承接 resource-oriented program kit。

## I18n 包规划

### 定位

`@logixjs/i18n` 是一个 **service-first** 领域包。

它负责：

- i18n driver 注入
- message token 语义
- 可选的 snapshot 投影

### 当前建议

- `token(...)` 继续作为稳定的可序列化翻译锚点
- semantic token contract 只承接：
  - stable key
  - semantic params
- i18n service 的 surviving public methods 固定为：
  - `snapshot`
  - `changeLanguage`
  - `render`
  - `renderReady`
- render fallback 不进入 semantic token contract
- 若仍需 projection，也应落在应用侧的明确辅助投影层，而不是包内默认主入口
- package root 当前只保留 `I18n / I18nTag / token(...)` 与 token contract types
- `./I18n`、`./Token` 与 `./*` 已退出 exact public surface

### 默认消费方式

- 普通业务逻辑优先通过 `$.use(I18nTag)` 消费
- 只有在明确需要 fixed root 解析域时，才走 `$.root.resolve(I18nTag)` 这条 expert 路径

### 收紧方向

- 不在包内继续保留 projection/module 形态
- package root 不再抬高 projection 或 module helper
- 不把 root/global 解析语义塞进日常主写法
- 不为 Form 或其他领域包新增专用 validation message façade
- 领域包若要承接用户文案，默认直接复用 i18n token contract，不复制第二消息合同
- 跨领域组合时，领域包只声明 token，render 继续归 i18n service
- 语言切换后的文案跟随，继续由消费侧对“token + i18n snapshot”重新求值驱动，不要求领域包改写自身 state
- 若领域包导出默认 locale assets，例如 `@logixjs/form/locales`，它们只算 plain locale assets，不携带 bucket key、driver metadata、registration hook 或 render helper
- locale asset 的 registration、merge order 与 bucket mapping，唯一 owner 固定为 application bootstrap
- canonical 路径固定为：应用先在 driver 构造前合并 domain default catalogs 与 app overrides，再把 driver 交给 `I18n.layer(driver)`
- cross-domain default catalogs 必须占有稳定且互不冲突的 key namespace；默认 catalog 冲突视为 authoring error，不依赖 merge 顺序静默覆盖
- app override layer 固定 `last-wins`
- application-owned bootstrap utility 若存在，也只能做 mechanical lowering，不能拥有独立 mapping / precedence policy
- locale asset 对任意 driver 的直接可注册性当前不冻结；若某 driver 需要 value-shape transform，只能停在 app-local pre-layer adapter
- 当前 freeze 不把 i18n 公共 canonical carrier 升成公开的 `I18nMessageToken | I18nLiteralToken` union
- 当前对 non-i18n authoring friction 的处理，已经只在 Form builtin authoring edge 提供窄 sugar；i18n 的公共 carrier 与 render contract 继续不改
- 若未来 reopen 其他 authoring sugar，也必须满足：
  - sugar 不新增 i18n 公共 carrier noun
  - sugar 在领域 authoring edge 立刻 lower
  - sugar 不能让 raw string 越过 authoring parser 边界
  - render / compare / diagnostics 继续只看到既有 canonical contract

### 当前一句话结论

I18n 的主身份已经收口为“服务能力 + semantic token contract”；root 只保留 `I18n / I18nTag / token(...)` 与 token contract types，subpath 与 wildcard contract 已退出。

## Domain 包规划

### 定位

`@logixjs/domain` 是一个承接 **program-first pattern kits** 的包。

它负责：

- 领域模板
- 业务模式 kit
- 例如 CRUD 一类高复用 domain abstraction

### 当前建议

- 包内 kit 统一走 program-first 方向
- 任何带 `Module` 的领域名字，都默认视为待删除或待重命名候选
- 语义必须重新对齐到新主线，不再暗示“第二套管理模型”
- `@logixjs/domain` root 已退出 exact public surface
- 当前唯一公开入口固定为 `@logixjs/domain/Crud`
- `./Crud` 当前只保留 `make / CrudProgram / CrudSpec / CrudApi`
- future commands sugar / recipe / preset 明确交给 toolkit

### 保留的能力

- 默认 state / initial / default logic
- 显式 `services.api`
- 少量 helper

### 收紧方向

- 默认 helper 面命名收敛到 `commands`
- 少量旧 helper 命名若暂时存在，只能视为残留，不得成为主叙事
- 领域 kit 不再暗示“超出 Module / Program 的额外相位对象”
- 调用方应清楚知道：拿到的是一份领域 program kit，而不是第二套 runtime abstraction
- 包名可以继续叫 `domain`，但对外默认讲的是若干 pattern kits，不讲“领域模块体系”

### 当前一句话结论

Domain 包在当前体系下已经收口为 rootless CRUD contract：`@logixjs/domain` root 不再承担公开入口，只保留 `@logixjs/domain/Crud` 这一条最小 program-kit 入口。

## CRUD 管理页的领域映射示例

一个典型 CRUD 管理页，推荐拆成 program-first 的业务单元，而不是默认做成单页面单模块。

推荐分层：

- `ListProgram`
  - 列表查询、筛选、分页、排序、选择态
- `EditorProgram`
  - 表单草稿、校验、提交与保存反馈
- `DetailProgram`
  - 选中项详情、详情面板和详情加载状态
- `BulkActionProgram`
  - 批量操作确认、执行与结果反馈
- `PageProgram`
  - 页级组合与协调

推荐逻辑类型：

- feature 内部逻辑
  - `list-fetch`
  - `editor-submit`
  - `detail-load`
  - `bulk-delete`
- 页级协调逻辑
  - `page-coordinate-selection-to-detail`
  - `page-coordinate-refresh-after-submit`

推荐装配心智：

- `Module` 表达每个局部业务边界
- `Logic` 表达每个局部或页级行为
- `Program` 把局部业务边界装配成可挂载单元
- `PageProgram` 作为 root program 组合其它 feature programs

这也是领域包默认更偏向 `program-first` 的原因：

- 它更符合页面、卡片、编辑器、弹窗这些实际业务挂载单元
- 它更容易被 examples、README 和 Agent 生成统一消费
- 它能减少“模块很可复用，但到底怎么装”的额外解释成本

## 未来领域包的统一准入规则

后续若继续长新的领域包，默认要先回答这几个问题：

### 1. 它是 service-first / program-first 哪一种

必须明确选一个主输出形态。

`pattern-kit` 只允许作为 package 组织形态存在；具体 kit 仍必须落到 `service-first` 或 `program-first` 之一。

### 2. 它是否引入了第二真相源

如果有：

- 第二套 runtime
- 第二套 cache truth
- 第二套调试事实源

默认拒绝。

### 3. 它的 commands 或句柄 helper 是否只是便利层

如果 commands 或其他句柄 helper 开始承载第二语义面，必须回退重设计。

### 4. 它是否能完全降到主链

必须能降到：

- `Module`
- `Logic`
- `Program`
- `Runtime`

### 5. 它是否能给出可反射静态 contract

领域包不能只给黑盒便利函数。

## 与命名后置的边界

本页固定的结构事实只有这些：

- Query 走 program-first 的 resource kit
- I18n 走 service-first 的 token/service 包
- Domain 走 program-first 的 pattern-kit 集合
- Form 的领域边界继续单独看 [../form/README.md](../form/README.md) 与 [./06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md)

仍然留给 naming bucket 的，只是少量仍未终局的通用命名问题，例如旧 helper 命名与内部符号名去向。

只要讨论已经升级到“包的主输出形态是什么、包该落在哪一层、是否会长第二真相源”，就继续回本页，不回 naming bucket。

examples 对齐补充：

- scenario-owned 代表样例继续优先落在 `examples/logix/src/features/customer-search/**`
- domain / feature docs 若需要 verification 邻接入口，统一回到 `examples/logix/src/verification/index.ts`
- package boundary 继续直接断言真实公开 API，不再依赖 package-level surface metadata

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./01-public-api-spine.md](./01-public-api-spine.md)
- [./05-logic-composition-and-override.md](./05-logic-composition-and-override.md)
- [../form/README.md](../form/README.md)
- [./06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md)
- [./09-verification-control-plane.md](./09-verification-control-plane.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../standards/logix-api-next-postponed-naming-items.md](../../standards/logix-api-next-postponed-naming-items.md)

## 当前一句话结论

Form 之外的领域包，在新体系下应更激进地重塑为：Query 是 program-first 的 resource kit，I18n 是 service-first 的 token/service 包，Domain 是 program-first 的 pattern-kit 集合；旧名字和旧壳层都不自动继承。
