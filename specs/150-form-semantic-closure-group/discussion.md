# Form Spec Hub Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 `149~154` active route。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史路由来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 记录 `150` 作为长期 hub 的 adopted route-manifest decisions 与 reopen bar。
**Status**: Adopted
**Feature**: [spec.md](./spec.md)

## Go-To Map

- 分类、当前状态、依赖顺序：看 `spec-registry.json`
- gap authority / closure contract：看 `docs/ssot/form/02-gap-map-and-target-direction.md`
- proof / acceptance / verification proof：看 `docs/ssot/form/06-capability-scenario-api-support-map.md`
- 当前波次与 reopen route：看 `docs/next/form-p0-semantic-closure-wave-plan.md`

## Adopted Shape

### 150 的最小价值

- `150` 只做 present-tense route manifest，不做 authority，不做 future backlog completeness。
- `150` 只回答三件事：
  - 当前议题归谁
  - 是否阻塞当前 `P0` semantic closure
  - 消费了哪些 imported decisions
- member 语义站位、exact noun、policy 倾向、人工讨论议程，不再由 `150` 代持。

### Entry Taxonomy 与 Admission

- registry 只保留三类 entry：
  - `member`
  - `predecessor`
  - `external`
- `member` 在当前 registry 中只保留 stopped historical members。
- `predecessor` 只表示曾被当前 route 消费的已冻结 spec。
- `external` 只表示当前 blocking route 需要回链的非-member owner page 或 wave route。
- `archived` 不进入 `150` taxonomy。
- 新 gap / 新 proof route / 新 follow-up proposal 先在 owner 工件成形。
- 只有当条目进入当前长期 route 时，才进入 `150` registry。
- 新条目进入 registry 时，默认先按 `external` 回挂；若后续成为活跃语义收口对象，再升为 `member`。

### Dependency Truth

- member DAG 的单点真相固定为 `spec-registry.json.entries[].dependsOn`。
- 历史 normalized DAG 记录为：`149 + 154 -> 151 -> 152 -> 153`。
- `149` 负责 theorem / legality gate。
- `154` 负责 shared boundary gate。
- discussion 不再复写人工顺序。

### Derived Views

- checklist 只作为 registry 的派生执行视图。
- checklist 不新增 taxonomy，不承接 hub contract，不反向定义 stage truth。
- 需要看成员执行状态时，先看 registry，再下钻 member 自己的 `spec.md / plan.md / discussion.md`，若成员存在 `tasks.md` 再继续下钻。

## Cluster Reviewer Summary

下面这组摘要只做 cluster 级 reviewer 入口。
具体细节与候选 API 形状，继续下钻各 member 自己的 `discussion.md`。

### 149 当前站位

- 当前推荐：继续**不冻结 exact noun**
- 若未来必须落 noun，第一推荐是 `rowId`
- 当前必砍：
  - `localId`
  - `renderKey` 作为 Form owner noun
  - 完整 `useFormList` helper family 抢跑 theorem

### 154 当前站位

- 当前推荐：先冻结 owner / boundary，不冻结 exact source noun
- 当前必砍：
  - rule direct fetch
  - Form 第二套 remote protocol
  - React 侧第二 remote sync path
- 讨论顺序：
  1. 先拍板 boundary 是否足够
  2. 再比较 exact noun 候选
  3. 最后才谈 snapshot shape

### 151 当前站位

- 默认终局：
  - `presence policy` 先只保留 `retain | drop`
  - `cleanup receipt` 先只进入 reason / evidence
  - active-set entry / exit 默认不先冻结 noun
- 必砍：
  - `keepErrors / keepPending / keepBlocking`
  - `onHide / onExit`
  - conditional subtree 的特殊 cleanup API
- 延后：
  - exact noun
  - direct reader
  - richer presence vocabulary
- 重开证据：
  - `retain | drop` 覆盖不了真实 active-set / compare / repair 场景
  - cleanup receipt 只停在 reason / evidence 会伤害 diagnostics 或 machine-comparability

### 152 当前站位

- grammar ceiling：
  - 当前只讨论 `deps / key / concurrency / debounce / submitImpact`
  - 不扩 retry family、richer task lifecycle、第二 blocker taxonomy、额外 settlement summary object
- 默认终局：
  - field / list.item / list.list / root 共用同一 contributor grammar
  - `submitImpact` 先只讨论 `block | observe`
  - `minItems / maxItems` 继续停在 list-level declaration
- 必砍：
  - 分 scope 各自 grammar
  - 大枚举 `submitImpact`
  - cardinality summary / state object
- 延后：
  - async declaration 的 exact noun
  - retry / refresh 等 richer policy
- 重开证据：
  - 单一 grammar 无法覆盖 field / list / root 的真实 submit gate 差异
  - `block | observe` 无法表达真实 blocking truth

### 153 当前站位

- 默认终局：
  - path explain 先不冻结 exact noun
  - `evidence envelope` 是 authority
  - `materialized report` 只是 on-demand view
  - `reasonSlotId.subjectRef` 继续只允许 `row | task | cleanup`
- 必砍：
  - 第二 explain object
  - 第二 issue tree / report truth
  - submit summary / compare feed 的额外 companion noun
- 延后：
  - path explain exact read surface
  - focus carrier exact shape
  - `subjectRef` 扩展集合
- 强 proof bundle：
  - same path: `invalid / pending / cleanup / stale`
  - same submit failure: `compare feed / repair focus / trial feed`
- 重开证据：
  - 不冻结 path explain noun 会直接伤害用户或 Agent 的可操作性
  - envelope 不能独自承接 compare / repair / trial 的 machine-comparable truth

### Cluster Sequence

当前 cluster 级推荐顺序固定为：

1. `149`
2. `154`
3. `151`
4. `152`
5. `153`

理由：

- `149` 和 `154` 先守 theorem / boundary，避免后续 lane 各自长第二 truth
- `151` 稳住 active universe，`152` 才不容易吃到漂移的 pending / blocking
- `152` 稳住 submit semantics，`153` 才能把 explain / evidence / compare 收到单一 authority

## Reopen Bar

- 只有在下面情况出现时，才允许重开 `150`：
  - 某个新条目改变当前 blocking DAG
  - 某个已冻结 spec 开始或停止被当前 route 消费
  - 现有 registry 已无法回答“归谁、是否阻塞、依赖谁”这三问
- future probes、future follow-up proposals、checklist kind 扩张，默认不在本轮重开。

## Decision Backlinks

- `specs/150-form-semantic-closure-group/spec.md`
- `specs/150-form-semantic-closure-group/plan.md`
- `specs/150-form-semantic-closure-group/spec-registry.json`
- `specs/150-form-semantic-closure-group/checklists/group.registry.md`
- `specs/README.md`
- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`
