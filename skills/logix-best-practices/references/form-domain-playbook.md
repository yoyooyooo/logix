---
title: Form 领域落地手册（事务友好）
---

# Form 领域落地手册（事务友好）

## 0) 适用场景

- 你在做表单输入联动、校验、提交。
- 你要把 Form 能力对齐到 Logix 事务语义与诊断链路。

## 1) 推荐分层

- `model`：领域字段与错误模型。
- `service`：Tag-only 外部依赖（校验/提交 API）。
- `def`：state/actions/同步 reducer。
- `logic`：联动、异步校验、提交流程编排。
- `impl`：initial + logics + imports/processes。

## 2) 业务流程（默认）

1. 字段输入：同步 `mutate/reducer` 更新本地状态。
2. 异步校验：优先 `runLatestTask`（防抖/取消旧请求）。
3. 提交：优先 `runExhaustTask`（防重复提交），必要时 `runLatestTask`。
4. writeback：成功/失败统一走事务入口回写。

## 3) 红线约束

- 同步事务窗口内不做 IO/await。
- 不在同步事务体里 dispatch 或调用 `run*Task`。
- 不用 `SubscriptionRef.set/update` 绕过事务入口写状态。
- 错误在 service 边界建模为领域错误，不直接冒泡裸 `Error/unknown`。

## 4) 性能与可解释性

- 高频字段更新优先字段级写入，避免 dirtyAll 退化。
- 动态数组结构变换需同步维护 UI/errors 对齐（避免错位）。
- 诊断输出保持 Slim + JsonValue，可被 Devtools/对齐链路消费。

## 5) 升级规则

- pattern 先放 feature 私有目录。
- 至少 2 个消费者再升级到全局 pattern。
- 升级后补复用门禁与回归用例，避免“伪复用”。

## 6) 延伸阅读（Skill 内）

- `references/llms/02-module-api-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/05-react-usage-basics.md`
- `references/llms/07-testing-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
