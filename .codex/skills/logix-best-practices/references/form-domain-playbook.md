---
title: Form 领域落地手册
---

# Form 领域落地手册

## 1) 目标

- 让字段联动、校验、提交在同一套 Logix 模型下可解释运行。
- 保持事务边界清晰：同步写入与异步 IO 分离。
- 在可复用与可维护之间取平衡：先 feature 内聚，再按复用升级。

## 2) 推荐结构

- `model`：领域数据与校验错误模型。
- `service`：Tag-only 外部依赖契约（校验/提交 API）。
- `def`：state/actions 与纯同步 reducer。
- `logic`：联动、异步校验、提交编排。
- `impl`：initial + logics + imports/processes。

## 3) 核心流程

1. 字段输入：优先同步 mutate/reducer 做本地状态更新。
2. 异步校验：`runLatestTask`（防抖 + 取消旧请求）。
3. 提交流程：`runExhaustTask`（防重复提交）或 `runLatestTask`（只保留最新）。
4. 成功/失败回写：统一在 writeback 阶段落盘状态。

## 4) 关键约束

- 同步事务窗口内不做 IO、不 dispatch 嵌套写入。
- 高频字段更新优先字段级写入，避免全量 dirty 退化。
- 错误在 service 边界收敛为领域错误，不直接冒泡裸异常。

## 5) 升级规则

- pattern 先放 feature 私有目录。
- 满足至少 2 个消费方再升级到全局 pattern。
- 升级后补复用门禁与回归用例，避免“伪复用”。
