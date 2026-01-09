# Quickstart: 087 Async Coordination Roadmap

本 quickstart 只覆盖“如何维护总控入口”，不包含任何 member 实现细节。

## 1) 刷新/生成 group checklist（index-only）

> 输出：`specs/087-async-coordination-roadmap/checklists/group.registry.md`

```bash
.codex/skills/speckit/scripts/bash/spec-group-checklist.sh 087 --from registry --name group.registry --title "Async Coordination" --force
```

## 2) 汇总成员 tasks 进度（只读）

```bash
.codex/skills/speckit/scripts/bash/extract-tasks.sh --json --feature 088 --feature 089 --feature 090 --feature 091 --feature 092
```

## 3) 变更成员与依赖（SSoT）

1. 只改 `specs/087-async-coordination-roadmap/spec-registry.json`
2. 重新生成 group checklist（见 1）

> 禁止做法：只在 `spec-registry.md` 增加成员但不改 json（会造成并行真相源）。
