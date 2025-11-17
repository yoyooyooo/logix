# Research: 015 Devtools Converge Performance Pane

**Feature**: `015-devtools-converge-performance`  
**Date**: 2025-12-18  

本研究聚焦“可落地的确定性约束”，避免在 Devtools 侧引入第二套真相源或补丁式特判。

## Decision 1: 事实输入来源（只依赖可序列化证据）

- **Decision**: converge pane 的事实输入只来自可序列化证据事件与聚合快照；不得读取运行时内部状态或推断缺失字段。
- **Rationale**: 这保证了跨宿主一致性（live vs 离线导入）与可交接性；也避免 Devtools 变成“隐式补丁层”。
- **Alternatives considered**:
  - 直接读运行时内部 cache/状态：会导致不同宿主不一致，且极易漂移。

## Decision 2: 排序降级（确定性优先）

- **Decision**: 优先使用全局排序键；当不可用时，退回“实例内单调序号”保证确定性排序；时间戳仅用于展示。
- **Rationale**: 排障与审计依赖可复现顺序；时间戳存在宿主差异与采样漂移风险。
- **Alternatives considered**:
  - 仅按时间戳排序：可能导致同证据在不同宿主结论漂移。
  - 无排序：会让时间轴失去意义。

## Decision 3: Audits 输出结构（最小且可序列化）

- **Decision**: Audits 产出必须可序列化，包含稳定 ID、解释、建议、证据前置条件；证据不足必须降级为“insufficient_evidence”并明确缺失字段。
- **Rationale**: 让“建议”可被审核、可回放；避免误导。
- **Alternatives considered**:
  - 直接输出自由文本结论：不可测试、不可回归、不可比较。

## Decision 4: 行动建议只提供“局部止血”两档

- **Decision**: 默认只输出两档可复制代码片段：Provider 范围覆盖（优先）与模块级覆盖（兜底）；不输出结构性改造建议。
- **Rationale**: 保持建议的确定性与可审计性，避免扩展到无法由证据可靠推导的“重构建议”。
- **Alternatives considered**:
  - 增加结构性建议：容易误导，且跨仓库不可泛化。

