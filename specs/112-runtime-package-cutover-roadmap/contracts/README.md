# Contracts: Runtime Package Cutover Roadmap

本特性没有业务 API 合同，只有总控调度合同。

## 1. Registry Contract

- `spec-registry.json` 是成员关系唯一 SSoT
- `spec-registry.md` 只做人读说明
- 状态和依赖只认 json

## 2. Group Checklist Contract

- `checklists/group.registry.md` 只链接成员入口
- 只允许引用 member 的 `tasks.md`、`quickstart.md`、必要证据路径
- 不允许复制 member 的实现任务

## 3. Member Completeness Contract

成员至少需要：

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/README.md`
- `quickstart.md`
- `tasks.md`
- `checklists/requirements.md`

## 4. Reuse-First Contract

- `115` 到 `119` 都必须登记可复用资产
- group 只检查登记是否存在，不替成员裁决实现细节

## 5. Routing Contract

- `113` 与 `114` 是所有成员前置门
- `115` 是 kernel 裁决门
- `116`、`117`、`118` 可在 `115` 之后并行
- `119` 最后收口 examples 与 verification

## 6. Closeout Contract

- 当成员全部完成后，`112` 仍需保持总控产物一致
- `spec-registry.json`、`spec-registry.md`、`tasks.md`、`checklists/group.registry.md` 必须同时反映完成态
- 总控文档允许保留成员依赖顺序与证据入口，但不应继续停留在“仅 planning 阶段”的旧口径
