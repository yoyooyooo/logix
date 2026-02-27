# API Checklist: O-022 Action API 分层门禁

**Purpose**: 高影响项 API breaking 审核与发布前清单  
**Created**: 2026-02-26  
**Feature**: [plan.md](../plan.md)

## 分层裁决

- [x] CHK001 是否明确把 `$.dispatchers` 标注为唯一一等公开高频入口？ [Clarity]
- [x] CHK002 是否明确 ActionIntent 为统一内核，`$.action(token)` 为动态入口？ [Consistency]
- [x] CHK003 是否明确 `$.dispatch(type,payload)` 仅为兼容/低阶入口？ [Completeness]

## Breaking 管理

- [x] CHK004 是否列出字符串入口潜在收紧/移除的影响范围？ [Coverage]
- [x] CHK005 是否给出从 `$.dispatch` 到 `$.dispatchers/$.action` 的迁移步骤？ [Traceability]

## 性能与诊断

- [x] CHK006 是否给出 `$.dispatchers` 热路径零额外分配目标与测量方法？ [Measurability]
- [x] CHK007 是否定义三入口统一诊断锚点与事件字段？ [Consistency]
