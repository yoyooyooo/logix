# Docs Writeback Matrix

| File | Role | Change Required | Gate |
| --- | --- | --- | --- |
| `docs/ssot/runtime/09-verification-control-plane.md` | SSoT | 说明 canonical route 与 expert route 的 owner 分层，以及 shared verification owner 的存在边界 | 文档 diff + route grep |
| `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md` | legacy cutover ledger | 把 `Reflection.verify*` 的 backing path 从 observability 借用更新为 neutral shared owner | ledger update |
| `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md` | legacy consumer matrix | 确认 expert-only hit 仍是 intentional，canonical route 不变 | ledger update + consumer grep |
| `specs/131-expert-verification-decouple/contracts/README.md` | spec-local contract | 记录最终 owner / route / forbidden edge contract | spec-local review |
| `specs/131-expert-verification-decouple/inventory/*.md` | spec-local inventory | 把 owner、shared primitive、dependency edge、consumer route 的最终状态写闭合 | final gate |

## Notes

- 若实现中新增需要回写的 docs 或 ledger，必须先补到本矩阵
- 只有当本矩阵中的所有 `Change Required` 都完成后，才能汇报 spec 闭环

## Execution Snapshot

### 2026-04-07

- `docs/ssot/runtime/09-verification-control-plane.md` 已补 canonical route / expert route 的 owner 分层
- `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md` 已补 neutral shared owner 路径
- `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md` 已补 expert backing 收口结果
- `pnpm typecheck`
  - PASS
- `quickstart.md` 中的 owner-edge grep、route grep、minimal vitest、`tsc` 已执行
- `132` 已接手 proof-kernel 第二波压缩，继续处理 canonical adapter 体积与职责压缩
