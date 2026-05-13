---
title: Orchestration Existence Challenge
status: living
owner: orchestration-existence-challenge
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/standards/logix-api-next-postponed-naming-items.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Orchestration Existence Challenge

## 目标

这轮不再只审四个 noun。

这轮直接审一整个 orchestration surface cluster，确认第二行为相位是否还在通过不同入口继续存活：

- `旧 workflow 公开面`
- `Program.make(..., { workflows })`
- `旧 process 定义入口`
- `Program.make(..., { processes })`
- `旧 process link 公开入口`
- `旧声明式 process link 公开入口`
- `旧 flow 公开入口`
- `旧 link 公开入口`

另外，本页还把 `@logixjs/react/ExpertHooks.useProcesses` 当作 dependent host witness 读取，但不在本页直接给它最终 fate。

本页先裁决“今天是否还配继续存在于公开 surface”，再裁决“若仍存在，应放哪、由谁持有、如何退糖”。

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `K1 orchestration existence challenge` 的单点 proposal
- 本页服务 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 中的 `K1`
- 本页不承认旧 expert family 叙事的默认保留资格
- 本页不允许“删 noun，留 slot，靠 host residue 继续活”这类后门
- 本页可以对 React owner 输出上游约束，但不代持 `R3` 的最终裁决

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [../standards/logix-api-next-postponed-naming-items.md](../standards/logix-api-next-postponed-naming-items.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## 当前 challenge override

下面这些 live 语句在本页里只算 prior baseline witness，不算默认结论：

- `workflow` 继续保留 expert/orchestration family
- `process` 继续保留 expert API
- `Program.make(Module, { workflows })` 继续作为公开装配槽位
- `Program.make(Module, { processes })` 继续作为公开装配槽位
- `Flow` 作为 business flow orchestration 继续公开
- `Link` 作为 canonical composition / cross-module access 继续公开
- `@logixjs/react/ExpertHooks.useProcesses` 可继续作为公开 host route

原因很直接：

- 它们都可能把旧 static-first / orchestration-first 心智继续拖回公开面
- 当前目标函数已经切到 `Agent first runtime`
- 在零存量用户前提下，旧概念没有默认存活权

### explicit override matrix

| surface | superseded authority | future live-doc owner |
| --- | --- | --- |
| `Workflow noun` | `runtime/03` 中把 `workflow` 保留为 expert/orchestration family 的语句 | `K1` fate 结果回写到 `runtime/03 + runtime/01 + guardrails` |
| `Program.config.workflows` | `runtime/03` 中把 `Program.make(..., { workflows })` 视为可继续公开装配的语句 | `K1` fate 结果回写到 `runtime/03 + runtime/01` |
| `旧 process 定义入口` | `runtime/03` 与 `guardrails` 中把 `旧 process 公开面` 当作默认 surviving expert API 的语句 | `K1` fate 结果回写到 `runtime/03 + guardrails + core package docs` |
| `Program.config.processes` | `runtime/03` 中把 `processes` 视为显式升级能力的保留语句 | `K1` fate 结果回写到 `runtime/03 + runtime/01` |
| `Flow` | core root barrel 里把 `Flow` 作为公开 namespace 的语句 | `K1` fate 结果回写到 core root barrel contract 与 `runtime/01` |
| `Link` | core root barrel 里把 `Link` 作为 canonical composition/cross-module access 的语句 | `K1` fate 结果回写到 core root barrel contract、`runtime/03` 与 `runtime/01` |
| `useProcesses` | React README、demo、ExpertHooks 里把它当公开 expert host route 的语句 | 最终 fate 由 `R3` 回写；`K1` 只回写上游约束 |

## 核心问题

这轮先问下面这些问题：

1. `Logic / Program / Runtime` 已经构成公开主链后，这组 orchestration surface 还有没有不可替代增量
2. 它们是否在制造第二行为相位对象
3. 删掉 noun 之后，slot 或 host residue 会不会继续把同一套概念偷运回来
4. 这组 surface 是否主要服务旧 static-first 目标函数
5. 若删掉它们，是否真的会损伤 `Agent authoring / runtime clarity / diagnostics / performance`

如果回答不了这些问题，默认 disposition 就是 `delete`。

## Admissibility Table

### 可作为 survival proof 的证据

- 删掉后会新长出更大的公开边界
- canonical host law / control-plane law 无法覆盖某个真实用户任务
- 删除会直接伤害 diagnostics、performance 或 runtime clarity，且没有更小 contract 可替代
- 候选对象能给出明确 `owner / future-authority / de-sugared mapping / why-not-delete`

### 只能算 residue witness 的证据

- 旧 expert family 文案
- 内部已有实现
- 旧 static IR 设计历史
- `useProcesses` 这类 internal-host residue 仍在使用
- examples / demos / current README promise / downstream current usage
- 命名熟悉度
- root barrel 里还在导出

这些 witness 最多只影响：

- `migration-cost`
- `docs cleanup cost`

它们不能影响：

- `semantic_disposition`
- `why-not-delete`

## Cluster Contract

### Row Sheet

| surface | current-reach | candidate-disposition | surviving-proof | delete-path | decision-owner | future-authority | host-constraint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Workflow noun` | `旧 workflow 公开面` | `delete` | 只有在它能证明独立 owner law、无法被 `Program + Logic + Runtime control-plane` 退糖替代、且不会重建第二行为相位时，才允许翻案 | 公开 noun 删除；不再保留静态 IR phase object | `K1` | `pending` | `n/a` |
| `Program.config.workflows` | `Program.make(..., { workflows })` | `delete` | 只有在它能证明公开 assembly surface 仍需承接不可替代 workflow slot 时，才允许翻案 | 从公开 assembly surface 移除；不再通过 canonical assembly path 接受 workflow object | `K1` | `pending` | `n/a` |
| `旧 process 定义入口` | `旧 process 定义入口` | `delete` | 只有在剥离 `link / linkDeclarative` residue 后，仍能证明存在不可替代的最小 runtime trigger contract，才允许翻案 | `Program.config.processes@app-scope` 删除；`Program.config.processes@instance-scope` 删除；`useProcesses@host-subtree` 只输出到 `R3 upstream constraint packet`；runtime 若仍需能力，只能 internalize 后另文重开 | `K1` | `pending` | `受 R3 upstream constraint packet 约束` |
| `旧 process 定义读取辅助` | `旧 process 定义读取辅助` | `delete` | 只有在它能证明独立于 `旧 process 定义入口` 仍有公开价值时，才允许翻案 | 与 `旧 process 定义入口` 同 fate 删除；host 若仍需 metadata，交由 `R3` 定义更小读取方式 | `K1` | `pending` | `不得作为 Process 保留证据` |
| `旧 process metadata 读取辅助` | `旧 process metadata 读取辅助` | `delete` | 只有在它能证明独立于 `旧 process 定义入口` 仍有公开价值时，才允许翻案 | 与 `旧 process 定义入口` 同 fate 删除 | `K1` | `pending` | `不得作为 Process 保留证据` |
| `旧 process metadata 写入辅助` | `旧 process metadata 写入辅助` | `delete` | 只有在它能证明独立于 `旧 process 定义入口` 仍有公开价值时，才允许翻案 | 与 `旧 process 定义入口` 同 fate 删除；examples / demos 不再把它当作公开写法 | `K1` | `pending` | `不得作为 Process 保留证据` |
| `Program.config.processes` | `Program.make(..., { processes })` | `delete` | 只有在它能证明公开 assembly surface 仍需承接不可替代 process slot 时，才允许翻案 | 从公开 assembly surface 移除；若 internal runtime 仍需入口，转 internal assembly path | `K1` | `pending` | `受 R3 upstream constraint packet 约束` |
| `旧 process link 公开入口` | `旧 process link 公开入口` | `delete` | 只有在它能证明相对 `Link` alias 与更小 contract 仍有独立 value 时，才允许翻案 | 与 `Link` 同 fate 删除 | `K1` | `pending` | `n/a` |
| `旧声明式 process link 公开入口` | `旧声明式 process link 公开入口` | `delete` | 只有在它能证明相对 `Link` alias 与更小 contract 仍有独立 value 时，才允许翻案 | 与 `Link` 同 fate 删除 | `K1` | `pending` | `n/a` |
| `Flow` | root `Logix.Flow` + `旧 flow 公开入口` | `delete` | 只有在它能证明自己不是薄壳且有独立 owner law 时，才允许翻案 | root/subpath 同 fate 删除 | `K1` | `pending` | `n/a` |
| `Link` | root `Logix.Link` + `旧 link 公开入口` | `delete` | 只有在它能证明自己不是 alias 壳层且有独立 value 时，才允许翻案 | root/subpath 同 fate 删除；`旧 link 别名入口*` 与 `旧 process link 公开入口*` 同 fate | `K1` | `pending` | `n/a` |
| `useProcesses` | `@logixjs/react/ExpertHooks.useProcesses` | `out-of-scope-final-fate` | `K1` 不裁最终 fate | 最终 semantic_disposition 交给 `R3`；K1 只冻结 `R3 upstream constraint packet` | `R3` | `R3` | `不得生成新的 public process noun；不得绕开 canonical host law；不得单独证明 Process 应保留；不得形成新的 host-owned assembly slot` |

### dependent host witness

`useProcesses` 在本页里的角色固定为 dependent witness：

- 它只用于证明“宿主侧仍有旧 orchestration 接缝”
- 它不能单独证明公开 `Process` 仍应继续存在
- 它的最终 `semantic_disposition / future-authority` 不在本页裁
- 本页只输出对 `R3` 的上游约束

### negative host constraint

在 `R3` 真正 materialize 之前，`useProcesses` 先冻结下面四条负向约束：

- 不得生成新的 public process noun
- 不得绕开 canonical host law
- 不得单独证明 `Process` 应保留
- 不得形成新的 host-owned assembly slot

这 4 条共同构成 `R3 upstream constraint packet`。

### example witness gate

examples / demos / README promise 当前都只算 witness：

- 它们不是 closure gate
- 它们不能单独证明某条 orchestration surface 该保留
- 它们最多只影响 `migration-cost` 与 `docs cleanup cost`
- 若某条 surface 最终删除，examples cleanup 由对应 `future live-doc owner` 承接

### 同 fate 规则

- root `Logix.Flow` 与 `旧 flow 公开入口` 必须同 fate
- root `Logix.Link` 与 `旧 link 公开入口` 必须同 fate
- `旧 link 别名入口` 与 `旧 process link 公开入口` 必须同 fate
- `旧声明式 link 别名入口` 与 `旧声明式 process link 公开入口` 必须同 fate
- 删 noun 不能默认留 slot
- 删 slot 不能默认保留 noun

## 当前证据

### `Workflow noun`

当前事实：

- 有独立 public subpath
- 公开对象同时持有 `def / validate / exportStaticIr / install`
- 仍直接绑定 `internal/workflow/compiler.ts` 与 `internal/runtime/core/WorkflowRuntime.ts`

当前张力：

- [03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md) 已把 canonical 主链压到 `Module / Logic / Program`
- [logix-api-next-postponed-naming-items.md](../standards/logix-api-next-postponed-naming-items.md) 已把 `Workflow` 退到局部验证原型、历史上下文或实现残留语境
- 命名后撤只算 witness
- 结构默认 delete 的直接理由，应来自第二行为相位风险与 static-first IR owner

### `Program.config.workflows`

当前事实：

- `Program.make(Module, { workflows })` 仍是公开装配槽位
- 它把 workflow surface 直接接回 canonical assembly path

当前张力：

- 即便删掉 `Workflow noun`，只要 slot 还在，旧相位对象就还能通过 assembly path 继续活

### `旧 process 定义入口`

当前事实：

- 有公开 subpath
- 承接 process meta、trigger、concurrency、error policy
- 仍可能是唯一需要认真 challenge 的 surviving candidate

当前张力：

- 它当前不是单一结构对象
- 它与 `旧 process link 公开入口 / 旧声明式 process link 公开入口` 共居同一个公开面
- 若不拆语义单元，就会把 residue 一起保留下来

### `旧 process 定义读取辅助 / getMeta / attachMeta`

当前事实：

- 它们和 `旧 process 定义入口` 同属公开 `旧 process 公开面` subpath
- `getDefinition` 已被 `useProcesses` 读取
- `attachMeta` 已被 examples 直接使用

当前张力：

- 如果 `旧 process 定义入口` 删除但 metadata helpers 留下，`旧 process 公开面` 仍会残留 ghost public surface
- 它们不应独立于 `旧 process 定义入口` 获得保留资格

### `Program.config.processes`

当前事实：

- 仍是公开装配槽位
- 会把 process family 重新接回 assembly path

当前张力：

- 若删掉 `Process noun` 但不删 slot，第二行为相位依旧悬挂在 public assembly path 上

### `旧 process link 公开入口` / `旧声明式 process link 公开入口`

当前事实：

- `旧 process link 公开入口` 是 blackbox path
- `旧声明式 process link 公开入口` 是 declarative path
- 两条路径一致性模型不同
- 两者仍在公开面里把 `link` 语义打包进 `Process`

当前张力：

- 这不是一个“极小 Process kernel”
- 若 `Process` 存活却不先拆掉这两条路径，`Link` 就会从侧门回流

### `Flow`

当前事实：

- root 与 subpath 都公开
- 代码层只是 `FlowRuntime.make` 薄 wrapper

当前张力：

- alias 深度接近机械删除
- 继续和 `Workflow / Process` 一起重审，会浪费 review budget

### `Link`

当前事实：

- root 与 subpath 都公开
- `旧 link 别名入口` 直接委托到 `旧 process link 公开入口`
- `旧声明式 link 别名入口` 直接委托到 `旧声明式 process link 公开入口`
- [03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md) 已明确写 `link` 退出公开 grammar

当前张力：

- grammar 已退，alias 还活
- 若不把 root 与 subpath 一起裁，容易留下 ghost surface

### `useProcesses`

当前事实：

- 仅经 `@logixjs/react/ExpertHooks` 暴露
- 安装过程直接走 `InternalContracts.installProcess`
- 当前真正被 host 消费的最小能力，更接近：
  - `processId metadata`
  - install/fork fallback

当前张力：

- 它只能证明仓内还有旧接缝
- 它不能单独证明公开 `Process` 仍应继续存在
- 它的最终 fate 继续由 React residue owner 决定
- 在 `R3` materialize 之前，必须先受上游负向约束约束
- 当前 README / demo 仍在使用它，但这类用法只能算 witness

## Default-Closed 子结论

当前先冻结一个 `alias-collapse lane`：

- `Flow`
- `Link`
- `旧 process link 公开入口`
- `旧声明式 process link 公开入口`

它们默认 `delete`。
若后续 reviewer 想让它们存活，必须先证明独立 value；否则不再进入主辩场。

## Survival Proof Gate

任何 orchestration surface 若想从 `delete` 升级，必须同时补齐：

- `owner`
- `future-authority`
- `de-sugared mapping`
- `why-not-delete`

除此之外，还要补齐对应的 delete-path：

- `assembly-slot fate`
- `host-witness fate`
- `root-subpath fate`
- `live-doc owner`

缺一项就不允许升到非 `delete` disposition。

## 方案比较

### A. 全 cluster 继续保留 expert family

做法：

- noun、slot、host residue 全部继续保留
- 只在文案上强调 non-canonical

问题：

- 等于默认承认旧相位对象继续存活
- 继续把 static-first residue 包成 expert 停车位

结论：

- 直接拒绝

### B. split-lane delete-first

做法：

- `Flow`、`Link` 直接进入 default-closed lane
- `旧 process link 公开入口`、`旧声明式 process link 公开入口` 与 `Link` 同 fate 审
- 主战场只保留：
  - `Workflow noun`
  - `Program.config.workflows`
  - `旧 process 定义入口`
  - `Program.config.processes`
  - `useProcesses`

收益：

- 先砍掉 alias residue
- 主 review 只保留真正可能 still alive 的 surface

风险：

- 若 `旧 process 定义入口` 仍写得太宽，依然可能留下 parking lot

### C. full delete

做法：

- 整个 cluster 全部退出公开 surface
- 真正仍需要的运行时原语，下沉到 internal runtime kernel

收益：

- 公开概念数最小
- 最符合 delete-first

风险：

- 若 reviewer 后续证明存在严格支配全删默认位的更小 surviving contract，则允许 reopen

## 当前推荐候选

当前唯一权威候选就是上面的 `Row Sheet`。
后续 review 只允许对 row 做挑战，不再对 prose 里的对象级重复表述做挑战。

## 未决行

当前真正还需要 why-not-delete 审查的，只剩下面 4 行：

- `Workflow noun`
- `Program.config.workflows`
- `旧 process 定义入口`
- `Program.config.processes`

其余行当前都已处在 delete-first 或 owner-routed 状态。

## 预期去向

本页消费后，后续至少要同步回写：

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/standards/logix-api-next-postponed-naming-items.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- 必要的 `@logixjs/core` / `@logixjs/react` package docs

## 当前一句话结论

`K1` 现在审的是一个 orchestration surface cluster，不再只是四个 noun；删 noun 不能留 slot，删 slot 不能靠 host residue 续命，`Flow / Link` 默认应先站到删除一侧，`Process` 也不再享有预设保留资格。
