# Writeback Rules

## Docs Writeback Matrix

| Change Type | Mandatory Docs Writeback | Mandatory Registry Writeback |
| --- | --- | --- |
| 新增或删除 root lane | `docs/README.md`、`docs/standards/docs-governance.md`、受影响的根 README | 若 docs coverage 变化，回写 `120/spec-registry.json` 与 `120/spec-registry.md` |
| 新增 runtime leaf page | `docs/ssot/runtime/README.md`、`docs/ssot/README.md`、相关 active next topic | 若新增页面进入 coverage，回写 `120/spec-registry.json` 与 `120/spec-registry.md` |
| 新增 platform leaf page | `docs/ssot/platform/README.md`、`docs/ssot/README.md`、相关 active next topic | 若新增页面进入 coverage，回写 `120/spec-registry.json` 与 `120/spec-registry.md` |
| 新增 active next topic | `docs/next/README.md`、topic 页元数据、必要时 `docs/README.md` | 若 topic 状态影响执行顺序，回写 `120/checklists/group.registry.md` |
| 新增 active proposal | `docs/proposals/README.md`、proposal 页元数据 | 若新增页面进入 coverage，回写 `120/spec-registry.json` 与 `120/spec-registry.md` |
| promotion lane 规则变化 | `docs/standards/docs-governance.md`、受影响的 README mesh | 无新增页面时可不动 registry |
| spec 批次完成 | 对应 spec 的 `tasks.md` 与必要的 `spec.md` | `120/spec-registry.json`、`120/spec-registry.md`、`120/checklists/group.registry.md` |

## Current Rule Notes

- foundation 页面变更优先回写 docs，再回写 registry
- `docs/archive/**` 不在 writeback 范围内
- batch 状态变化一律以 `120/spec-registry.json` 为关系事实源
