# Quickstart: 080 Full-Duplex Prelude（总控入口怎么用）

## 1) 先读总控裁决

- 总控说明：`specs/080-full-duplex-prelude/spec.md`
- 成员关系（机器可读）：`specs/080-full-duplex-prelude/spec-registry.json`
- 成员定位与 Hard/Spike 标记（人读）：`specs/080-full-duplex-prelude/spec-registry.md`

## 2) 生成/刷新 group 执行索引清单（只做跳转，不复制 tasks）

从仓库根目录运行：

```bash
SKILL_DIR=".codex/skills/speckit"
"$SKILL_DIR/scripts/bash/spec-group-checklist.sh" 080 --from registry --name group.registry --title "Full-Duplex Prelude（080）" --force
```

输出文件：`specs/080-full-duplex-prelude/checklists/group.registry.md`

## 3) 可选：渲染依赖图（只读）

```bash
SKILL_DIR=".codex/skills/speckit"
"$SKILL_DIR/scripts/bash/spec-registry-graph.sh" 080
```

## 4) 可选：跨 spec 联合验收（只读）

当需要把多个成员 spec 一起验收时，按 `$speckit acceptance` 的 multi-spec 方式执行（具体以 `speckit` skill 的 `acceptance` stage 为准）。
