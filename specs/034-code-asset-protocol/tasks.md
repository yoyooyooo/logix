# Tasks: Code Asset Protocol（034：CodeAsset/Deps/Digest/Anchor）

**Input**: `specs/034-code-asset-protocol/spec.md`  
**Prerequisites**: `specs/034-code-asset-protocol/plan.md`（required）

## Phase 1: Contracts（P0）

- [x] T001 补齐 034 contracts schemas（CodeAsset/CodeAssetRef/Deps/ReversibilityAnchor）`specs/034-code-asset-protocol/contracts/schemas/*`
- [x] T002 [P] 增加 contracts 预检测试（034 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.034.CodeAssetContracts.test.ts`

## Phase 2+: 实现（Deferred）

> 资产保存/预览管线与 UI 集成属于长期跑道：后续按 Workbench/Studio 的消费者需求分阶段推进。
