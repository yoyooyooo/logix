# Implementation Plan: Code Asset Protocol（034）

**Branch**: `034-code-asset-protocol` | **Date**: 2026-01-26 | **Spec**: `specs/034-code-asset-protocol/spec.md`

## Summary

本 spec 从 035 拆分出“引用载体协议”：

- `CodeAsset@v1`：source + normalizedIr + deps + digest + budgets/capabilities + anchor
- `Deps@v1`：显式依赖（reads/services/configs），reads 的地址空间引用 035 的 `PortAddress`
- `ReversibilityAnchor@v1`：可逆溯源锚点

## Deliverables

- `specs/034-code-asset-protocol/contracts/schemas/*` 固化协议 schema
- （实现落点后续在 tasks 中推进）Sandbox/Workbench 的保存/校验/预览管线

