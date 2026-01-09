# Tasks: Logix Control Laws v1（Spec Group）

**Input**: `specs/077-logix-control-laws-v1/{spec,plan}.md`  
**Rule**: 不复制 member tasks；只做索引、门槛与验收派发。

## Phase 1: Registry（关系 SSoT）

- [ ] T001 Create/maintain `specs/077-logix-control-laws-v1/spec-registry.json` (members + dependsOn + status)
- [ ] T002 Sync `specs/077-logix-control-laws-v1/spec-registry.md` human-readable notes (no extra relations beyond json)

## Phase 2: Group Checklist（索引式执行清单）

- [ ] T010 Generate checklist via speckit script:
  - `SKILL_DIR=.codex/skills/speckit`
  - `"$SKILL_DIR/scripts/bash/spec-group-checklist.sh" 077 --from registry --name group.registry --title "Control Laws v1: 073 → 075 → 076"`

## Phase 3: Drift Guards（公式驱动）

- [ ] T020 Ensure 075/076 specs explicitly reference `docs/ssot/platform/foundation/01-the-one.md` (avoid local re-definitions)
- [ ] T021 Ensure 073/075/076 all keep “no shadow timeline / no dual truth source / txn 禁 IO” as hard constraints (docs-first)
- [ ] T022 Spec drift audit：对所有涉及 **控制律（Π）/时间语义/自动触发/Watcher** 的 specs，用 `spec.md` 的“三问裁决”逐个判定，并把结论沉淀成可执行清单（哪些仅需微调，哪些必须重构/拆分/暂停）

## Phase 4: Integrated Acceptance（只做派发）

- [ ] T030 Run multi-spec acceptance (read-only output) for 073/075/076:
  - `$speckit acceptance 073 075 076`
