---
title: "@effect/platform HttpApi（Unstable）风险调研与落地护栏"
status: draft
version: 2025-12-18
value: extension
priority: next
related:
  - ../topics/sdd-platform
  - ../topics/devtools-and-studio
---

# @effect/platform HttpApi（Unstable）风险调研与落地护栏

## TL;DR

- `@effect/platform` 的 **Http API / Http Client / Http Server** 被官方标记为 **Unstable**，含义是“仍在开发/实验阶段，API/行为可能变化”，不是指“运行时不稳定”。
- 从公开 issue 与提交轨迹看：风险更集中在 **表达能力边界仍在收敛**（例如 headers / 多成功响应 / 中间件上下文 / client 组合），以及 **OpenAPI 生成细节** 持续修正；并非“每周都大改接口”。
- 落地最稳的做法：**把 HttpApi 锁在边界层**（contract+adapter），业务层只依赖自有 Service/Tag；锁版本 + OpenAPI 快照 + 少量烟测；必要时关键接口回退到 `HttpRouter/HttpApp` 手写。

## 背景与适用范围

本调研服务于以下前置共识/场景：

- 平台后端主库倾向 `PostgreSQL`（业务数据 + 一定量半结构化数据，且当前不以海量 trace 分析为主）。
- 后端倾向 `TypeScript + Effect`，并评估采用 `@effect/platform` 的 `HttpApi/HttpApiBuilder` 来实现“契约先行 + 自动校验 + client / OpenAPI 复用”。

## 官方口径：Unstable 的定义与范围

官方文档将以下模块列为 Unstable，并提示“still in development / experimental / subject to change”：

- `Http API`
- `Http Client`
- `Http Server`
- `Socket`
- `Worker`

参考：

- https://effect.website/docs/platform/introduction/

## 证据 1：公开 issue 反映的“未收敛点”

与 `HttpApi` 直接相关、且能映射到“为什么标 unstable”的典型问题：

- **表达能力缺口：headers / content-type / encoding 等**
  - https://github.com/Effect-TS/effect/issues/4229
- **语义边界仍在对齐：Schema transform 的 encode 是否应该自动应用**
  - https://github.com/Effect-TS/effect/issues/5188
- **中间件上下文组合问题：类型允许但运行期拿不到 RouteContext**
  - https://github.com/Effect-TS/effect/issues/5747
- **多成功响应难以选择（Created / NoContent 等）**
  - https://github.com/Effect-TS/effect/issues/4039
- **client 组合能力的边界：transformClient 与 retry 之类的组合顺序**
  - https://github.com/Effect-TS/effect/issues/3715
- **打包/平台无关性边界：引入 @effect/platform 的某些模块触发 Node 依赖**
  - https://github.com/Effect-TS/effect/issues/4660
- **OpenAPI 兼容细节仍在修正**
  - https://github.com/Effect-TS/effect/issues/5061
- **DecodeError 的可定制性不足（难以模拟既有 API 的错误格式）**
  - https://github.com/Effect-TS/effect/issues/5465

补充信号：社区 `effect-http` 项目在 README 中明确提示 `@effect/platform` 新增 `HttpApi` 模块作为“官方延续”，自身进入迁移期维护。

- https://github.com/sukovanej/effect-http

## 证据 2：提交轨迹（宏观观察）

从 `Effect-TS/effect` 的公开提交轨迹可观察到：

- `HttpApi` 模块在 `2024-08-30` 左右引入到 platform（PR #3495）。
  - https://github.com/Effect-TS/effect/pull/3495
- `2024-10-21` 出现 “HttpApi second revision”（PR #3794），符合 Unstable 模块在收敛期的典型特征：可能阶段性重塑设计。
  - https://github.com/Effect-TS/effect/pull/3794
- 进入 2025 年后更偏向补齐边角/修正 OpenAPI/改进 Client/Schema（但升级仍需预期断点，尤其在下载/headers/multi-status/中间件上下文/edge 打包等边角能力上）。

## 风险画像（面向落地）

把不稳定拆成可操作的几类风险（从高到低）：

1. **表达边界不稳定**：今天能描述的 API 维度，明天可能新增/改变（headers、content negotiation、多 success、stream/file 等）。
2. **管线组合语义不稳定**：中间件/上下文/transformClient 的执行顺序、可拿到的 context、错误/重试/观测的插入点，可能调整。
3. **规范产物不稳定**：`OpenApi.fromApi` 输出细节随对齐持续变化（对外暴露 SDK/文档时需要快照约束）。
4. **跨运行时/打包边界**：platform 包的某些内部依赖可能影响非 Node 环境（只跑 Node 可显著降低该风险）。

## 推荐落地护栏（把风险压到可控范围）

如果决定使用 `HttpApi`：

- **边界隔离**：把 `HttpApi*` 只放在两层里：
  - `contract`（API 定义：endpoint + Schema + errors + security）
  - `adapter`（HttpApiBuilder/Server/Client/OpenApi 集成）
  - 业务层仅依赖你们自己的 `Service/Repository` 接口（Effect Tag），不要让业务直接 import `HttpApi*`。
- **锁版本**：`effect` + `@effect/*` 使用固定版本（禁止 caret 漂移），把升级当作显式任务。
- **两类护栏测试（最小集合）**：
  - `OpenApi` 产物快照（避免对外契约悄悄漂移）。
  - “烟测”覆盖：schema decode error 映射、鉴权失败、一个典型接口（query/path/body）、以及一个需要自定义 header/content-type 的边角接口（若你们有）。
- **回退通道**：遇到表达能力缺口时，允许个别接口回退到 `HttpRouter/HttpApp` 手写（但在 contract 层保留 Schema 以维持类型与文档一致性）。

如果你们 **不强依赖** “自动 client / OpenAPI”：

- 更稳的过渡方案：先用 `HttpRouter + 自己封一层薄 DSL` 固化团队风格（method/path + Schema + handler + error mapping），等 `HttpApi` 更成熟后再把 DSL 迁移到 `HttpApi` 的 contract 表达（业务层不动）。

