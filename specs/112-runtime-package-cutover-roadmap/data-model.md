# Data Model: Runtime Package Cutover Roadmap

## 1. `MemberSpecEntry`

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | 成员 spec 编号 |
| `dir` | string | 成员 spec 目录 |
| `status` | enum | `idea` / `planned` / `draft` / `implementing` / `done` / `frozen` |
| `dependsOn` | string[] | 依赖的其他 member ids |
| `scope` | string | 该成员承接的主题 |

## 2. `MilestoneGate`

| Field | Type | Description |
| --- | --- | --- |
| `gateId` | string | gate 编号 |
| `requires` | string[] | 必须先达标的 members |
| `criteria` | string | 达标条件 |
| `evidencePath` | string | 证据或 checklist 落点 |

## 3. `ArtifactCoverage`

| Field | Type | Description |
| --- | --- | --- |
| `featureId` | string | spec 编号 |
| `hasPlan` | boolean | 是否有 `plan.md` |
| `hasResearch` | boolean | 是否有 `research.md` |
| `hasDataModel` | boolean | 是否有 `data-model.md` |
| `hasContracts` | boolean | 是否有 `contracts/` |
| `hasQuickstart` | boolean | 是否有 `quickstart.md` |
| `hasTasks` | boolean | 是否有 `tasks.md` |
| `hasChecklist` | boolean | 是否有 `checklists/requirements.md` |

## 4. `ReuseGate`

| Field | Type | Description |
| --- | --- | --- |
| `featureId` | string | spec 编号 |
| `requiresReuseInventory` | boolean | 是否必须先登记可复用资产 |
| `notes` | string | 说明 |

## Relationship Notes

- `MemberSpecEntry` 决定 group registry 的依赖顺序
- `ArtifactCoverage` 决定某个成员能否进入 group checklist
- `ReuseGate` 约束 `115` 到 `119`
- `MilestoneGate` 连接 group checklist 与成员完成条件
