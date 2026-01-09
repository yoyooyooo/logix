# Research: 079 保守自动补全 Platform-Grade 锚点声明（单一真相源）

## 目标与边界

本特性要解决的不是“平台拿不到信息”，而是“信息没以 Platform-Grade 锚点的方式显式写在源码里”：

- 平台/Devtools 需要 **稳定可枚举** 的锚点（Static IR）来构建关系图、解释链路与门禁；
- Runtime/TrialRun 只能提供 **动态证据**（Dynamic Evidence），覆盖不完备且容易受分支/环境影响；
- 全双工要求一小块子集 **可解析 + 可回写**，否则“码↔图”会因漂移而不可控。

核心约束：

- 单一真相源：补全结果必须写回源码锚点字段；报告/缓存不作为长期权威。
- 宁可错过不可乱补：不确定就跳过，并给出可行动的原因。

## 现状盘点（已有能力能拿到什么）

### 1) Loader/反射（不读 AST）

- `@logixjs/core` 已提供：
  - `Reflection.extractManifest`：导出 `ModuleManifest`（可序列化、可 diff）。
  - `Reflection.exportStaticIr`：导出 Static IR（StateTrait IR）。
  - `Observability.trialRunModule`：BuildEnv 中对 module 做受控试跑，导出 `TrialRunReport`（含 environment/evidence/artifacts）。
- 现状的 `ModuleManifest` 已包含：actions/effects/schemaKeys/logicUnits/meta/source/staticIr/digest 等，但 **尚未包含** `servicePorts`（由 `078` 补齐）。

结论：Loader/反射能提供“最终对象的结构摘要”，但它不解决“源码里没写锚点字段”的问题；它只能作为补全与对齐的输入/校验。

### 2) TrialRun（动态证据）

`trialRunModule` 目前可提供：

- `environment.tagIds / configKeys`：环境中出现的服务/配置键集合（含缺失项并集）；
- `environment.missingServices / missingConfigKeys`：缺失依赖（服务目前大量依赖 error message 兜底解析）；
- `runtimeServicesEvidence`：控制面证据（scope/bindings/overridesApplied 等）；
- `evidence.events`：runtime debug 事件序列（Slim/JSON 投影）。

结论：TrialRun 对“当前执行路径”很有价值，但无法保证覆盖所有分支；也很难在没有 `servicePorts` 静态声明时定位到 `moduleId+port`。因此 TrialRun 更适合作为 **校验/诊断证据**，不适合作为写回的唯一依据。

### 3) 全双工/Parser 规划（AST 子集）

`docs/ssot/platform/ir/00-codegen-and-parser.md` 已明确：

- Parser 只对白盒子集负责：`Logix.Module.make`、`ModuleDef.logic(($)=>...)`、`yield* $.use(...)`、Fluent Intent 链等；
- 对动态/中转变量/复杂闭包统一降级为 Raw Mode（只展示，不重写）。

结论：**AST 子集识别是“可回写”的必要前提**。只要我们把补全能力限制在这块子集，就能同时满足“宁可漏不乱补”和“全双工可逆”的要求。

## “试跑/IR/全双工”视角：可共用的补全手法清单

三者对“补全”的共同需求可以抽象为同一条流水线：

> 识别定义点（AST）→ 识别缺口（锚点字段缺失）→ 推导候选（静态/证据）→ 生成最小补丁（写回源码）→ 输出报告（门禁/Devtools）

可复用的补全对象（按确定性排序）：

1. **定位锚点元数据**（如 `dev.source`）：完全由 AST 位置确定，确定性最高。
2. **服务依赖锚点声明**（`services`）：在 Platform-Grade 子集内可通过 `yield* $.use(ServiceTag)` 静态识别；前提是能推导出稳定 `serviceId`。
3. **装配锚点声明**（`imports` 等）：跨文件组合的歧义更大，建议先 report-only，再逐步放开写回。

动态证据可做的事（但默认不写回）：

- TrialRun 证明“某些依赖在当前路径确实会缺失/被使用”，可用于解释与 gate；
- Loader Execution/Spy Context 可作为建议生成器，但覆盖与副作用治理成本高，不适合作为默认权威来源。

## 为什么“显式声明 services”仍然必要

即便我们实现了补全：

- 静态识别只覆盖 Platform-Grade 子集；业务一旦写出动态/黑盒形态，补全会跳过。
- “未走过分支”的服务依赖，不可能仅靠一次试跑保证覆盖。

因此：

- `078` 提供 **显式声明 + Manifest 导出** 的权威契约；
- `079` 只是把“作者忘写/写法可确定”的缺口补齐，降低手写成本，并把“不确定”的问题显式报告出来，逼迫作者在需要时手写声明。

## 风险与缓解

- **误补全导致 IR 漂移**：默认只补缺失字段；严格 reason codes；对 spread/动态表达式默认跳过。
- **端口名语义误导**：默认 `port=serviceId`，拒绝推断业务别名；语义别名应由作者显式写。
- **副作用风险（动态 import / Loader Execution）**：写回依据优先走 AST；动态执行仅作校验输入且必须可控超时/收束。

## 本阶段结论

`079` 应以“AST 子集内的保守补全 + 结构化报告”作为主线交付；TrialRun/Loader 作为辅助手段进入报告与校验，但不反向决定写回。

