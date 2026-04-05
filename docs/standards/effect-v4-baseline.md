---
title: Effect V4 Baseline
status: living
version: 1
---

# Effect V4 Baseline

## 当前基线

- 主分支已经切到 Effect V4
- 当前 workspace override 固定为 `effect@4.0.0-beta.28`
- 相关配套版本固定为：
  - `@effect/vitest@4.0.0-beta.28`
  - `@effect/platform-node@4.0.0-beta.28`
  - `@effect/sql-pg@4.0.0-beta.28`

## 写作与实现规则

- 所有新代码默认按 Effect V4 写
- 所有新测试默认按 Effect V4 写
- 所有新文档默认按 Effect V4 写
- 禁止按 V3 心智新增实现、示例、注释或 API 说明

## 知识冲突处理

- 若固有认知与当前类型错误、TS 提示、本地 d.ts 冲突，一律以本地类型定义和编译器为准
- 若仓库内仍残留 `v3` 字样、旧包描述、旧注释或旧迁移说明，默认视为历史漂移，不构成当前实现依据
- 若对 Effect API 有疑问，优先使用 context7 或直接核对本地类型定义

## 默认验证

- `pnpm check:effect-v4-matrix`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`

## 当前一句话结论

Effect V4 已经是主分支唯一目标版本；新增内容必须按 V4 心智和 V4 实际类型来写。
