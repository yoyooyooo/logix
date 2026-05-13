# Quickstart: 112 Runtime Package Cutover Roadmap

## 1. 看成员关系

先读：

- `specs/112-runtime-package-cutover-roadmap/spec.md`
- `specs/112-runtime-package-cutover-roadmap/spec-registry.json`
- `specs/112-runtime-package-cutover-roadmap/spec-registry.md`

## 2. 当前下一步

- `113` 已完成
- `114` 已完成
- `115` 到 `119` 也已完成
- 当前不再有“下一波待执行成员”；若要查看统一调度与收口结果，优先打开 `checklists/group.registry.md`

## 3. 当前门禁

- Gate A 到 Gate D 已全部满足
- 当前这一轮 group member 已全部收口
- `112` 现在主要用于审视成员关系、证据落点和统一口径

## 4. 更新状态

只改 `spec-registry.json`，不要只改 `spec-registry.md`

若是回写总控 closeout，还应同步：

- `spec-registry.md`
- `tasks.md`
- `checklists/group.registry.md`

## 5. 刷新 group checklist

```bash
./.codex/skills/speckit/scripts/bash/spec-group-checklist.sh 112 --from registry --name group.registry --title "Runtime Package Cutover" --force
```
