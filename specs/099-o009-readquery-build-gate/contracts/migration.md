# Migration: Runtime Strict Gate -> Build-Time Gate

## Breaking Change Summary

- strict gate 主判定时机从运行时迁移到构建期。
- 运行时不再对“已定级 selector”重复判定 strict gate。

## Required Actions

1. 在构建流程接入 selector 质量报告生成。
2. 将 strict gate 配置迁移到构建配置（运行时仅保留兜底策略）。
3. 对未定级 selector 补齐显式 ReadQuery 或 fieldPaths 声明。
4. 在 CI 中把 build gate 失败视为阻断条件。

## Non-Goals

- 不提供兼容层。
- 不提供弃用期。

## Rollback Guidance

- 若短期无法全量迁移，可将构建期 mode 设为 `warn`，但必须保留报告并建立清单闭环。
