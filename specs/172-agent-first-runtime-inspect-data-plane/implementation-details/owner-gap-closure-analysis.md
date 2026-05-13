# 172 Owner Gap Closure Analysis

本文件最初用于分析 172 已关闭后仍以 structured gap 或 deferred owner 形式存在的 owner producer 缺口。179 关闭后，它的角色变为 post-179 closure ledger：记录哪些 gap 已被提升为 owner-backed producer，哪些仍按 SSoT 18 保持 deferred，避免后续把已关闭内容重复塞回 172。

本文不改变 [../parity-matrix.md](../parity-matrix.md) 的关闭语义：P1 row 仍按 `Owner-backed or gap` 关闭。本文回答下一轮如果要把 gap 补成真正面向未来的 owner-backed payload，应该先建立什么内核事实源，哪些现有实现可以复用，哪些应该让道或被替换。

当前结论：

- 174 已关闭 reflection live binding owner。
- 175 已关闭 runtime-live operation ledger owner。
- 176 已关闭 field-runtime inspect owner。
- 177 已关闭 timeline projection。
- 178 已关闭 summary projection。
- 179 已关闭 diagnostics/process Debug event source bridge。
- Runtime Inspect Coverage Harness 当前记录 21 个 fact families：17 owner-backed、0 structured-gap、2 deferred、2 rejected。
- 剩余 backlog 只有 React host evidence owner 和 local profiler owner。它们不是 172/173 implementation debt，必须按 SSoT 18 reopen bar 解锁。

终局口径：

- Runtime inspect 的事实源必须在 owner module 内形成，不在 CLI、daemon、browser adapter、Workbench 或 React UI state 中拼装。
- structured gap 不是终局能力，只是 172 route closure 的安全占位。
- 如果当前 producer 只适合 console、DevTools UI 或测试 proof，不应为了省事把它提升为 inspect truth。
- 优先级按“能力上限”和“后续依赖”排序，不按短期实现成本排序。
- 可以重构现有 DebugSink、field debug registry、React dev lifecycle binding 和 live adapter，只要能换来更小、更一致、更可诊断的终局 owner model。

# End-State Inspect Owner Model

终局应先形成三条 owner-side inspect source，而不是按 CLI 命令逐个补：

- `runtime-live operation ledger`：拥有 target-scoped event window、operation window、diagnostics/process events、timeline watermark 和 stateAfter source。
- `field-runtime inspect model`：拥有 field list、field graph、field summary、field event metadata 和 field converge summary。
- `reflection live binding model`：拥有 live target 到 reflection manifest 的稳定 binding、action payload summary、validator availability 和 dispatch admission header。

这三条 source 之外，daemon 只负责 attachment、routing、lineage、queue 和 artifact persistence；browser adapter 只负责桥接 active host；CLI 只负责 machine transport；Workbench 只消费 artifact refs、canonical evidence 和 gaps。

# Action Manifest Binding

涉及 rows：`R172-005`、`R172-006`、`R172-007`、`R172-008`、`R172-021`。

当前状态：closed by 174。

- Coverage harness 将 `action-manifest`、`dispatch-validation`、`static-summary` 记为 owner-backed。
- 174 将 `LiveManifestBindingRef` 提升为 reflection owner-side binding fact。
- canonical dogfood target 必须返回 matched binding。
- `missing-live-manifest-binding` 只保留为 target-scoped transient gap，不能作为 P0 结构性关闭条件。

终局判断：

- 这不是 P1 gap，而是 P0 owner model 的完整性风险。
- 终局不应允许 canonical live target 的 action inspect 依赖 React hook 路径是否碰巧携带 manifest。
- `LiveManifestBindingRef` 应成为 runtime/reflection 边界的稳定事实，不是 browser adapter 临时从 binding 对象里拼出来的字段。

现有实现让道点：

- 如果当前 dev lifecycle binding 无法稳定携带 manifest digest，应调整 binding contract。
- 如果 `useModule(ModuleTag)`、direct runtime binding、runtime carrier offer 的 manifest 链路不一致，应合并为一个 owner-side binding producer。
- Browser adapter 里读取完整 `reflectionManifest` 再投影 action list的方式可以保留为过渡 producer，但终局应让 reflection owner 直接产出 action inspect payload 或 binding ref。

优先级：closed foundation。

建议终局形态：

- reflection owner 产出 `LiveManifestBindingRef`，并拥有 action payload summary、schema digest、validator availability。
- runtime-live dispatch admission 只接受 binding header，不接受 CLI/browser adapter 传来的 action schema truth。
- static-summary 只引用 binding ref 或 manifest artifact ref，不复制 manifest 内容。
- canonical dogfood target 必须稳定返回 matched binding；`missing-live-manifest-binding` 只保留为 per-target transient failure。

验收重点：

- `logix live actions` 在 canonical runtime target 上稳定返回 owner-backed action payload。
- dispatch no-mutation denial 与 action inspect 复用同一 binding fact。
- 没有 CLI-side source reflection、browser-side schema invention 或 manifest copy。

# Runtime-Live Operation Ledger

涉及 rows：`R172-010`、`R172-011`、`R172-012`、`R172-013`、`R172-014`、`R172-019`、`R172-020`。

当前状态：closed by 175, then completed by 177/178/179 projections.

- 175 建立 target-scoped operation ledger、event envelope、ordering、watermark、stateAfter source ref law、bounded operation windows 和 runtime-live owner gaps。
- 177 使用 175 operation windows 和 176 field semantic payloads 关闭 timeline / field timeline projection。
- 178 使用 175 operation windows 关闭 operation summary / activity counts。
- 179 使用 DebugSink source bridge 关闭 diagnostics / process-events。

179 closure:

- `diagnostics` and `process-events` are now owner-backed through the 179 Debug event source bridge.
- DebugSink remains source material. 175 runtime-live ledger owns diagnostic/process envelopes, order, watermarks, retention and read-time normalization.
- `unsupported-event-kind` is no longer the normal closure state for `events --kind diagnostic|process`; it remains only for genuinely unsupported source kinds.

终局判断：

- event window、timeline、operation summary、diagnostics 和 process events 不应分别补成五个独立 producer。
- 它们应来自同一个 target-scoped operation ledger。ledger 是运行时可诊断性的主干，而不是 DevTools UI 的副产物。
- 如果当前 DebugSink 只适合分散事件转发，应挑战它的角色：DebugSink 可以继续作为 sink/producer hook，但 ledger 才是 inspect owner source。

现有实现让道点：

- `DebugSink` 的事件记录如果缺 target coordinate、txn/op watermark、post-state ref，需要调整事件 envelope。
- 现有 runtime operation events 若只服务 reflection/workbench，应归一到 ledger 的事件 taxonomy。
- Browser adapter 当前对非 state/actions 返回 gaps 的行为应保留为安全 fallback，但不应成为长期 producer 层。

优先级：closed foundation.

建议终局形态：

- 每个 runtime target 维护 bounded operation ledger。
- ledger item 至少包含 `eventId`、`kind`、`target`、`txnSeq`、`opSeq`、`linkId`、`timestamp/order`、`summary`、`artifactRef`、`redaction/degraded markers`。
- operation window、event window、diagnostics、process events、summary 都从 ledger 投影。
- ledger 在 diagnostics disabled path 下不应启用高开销 payload 捕获；可保留 slim structural markers。

需要内核改造：

- 统一 runtime event taxonomy。
- 统一 target/instance coordinate 注入点。
- 在事务提交点形成稳定 watermark。
- 明确 ledger buffer lifecycle、卸载清理、budget、sampling 和 redaction。

验收重点：

- `logix live events` 能按 target 和 kind 返回 owner-backed bounded window。
- `logix live summary` 从同一 ledger 投影 event/txn/operation summary。
- diagnostics/process events 不再是 unsupported kind 的常态。
- daemon/CLI/browser adapter 不聚合 raw events。

# Timeline StateAfter

涉及 rows：`R172-011`、`R172-012`。

当前状态：closed by 177.

177 已将 timeline 从 structured gap 提升为 owner-backed projection。它消费 175 ordering/watermark/stateAfter source refs 和 176 field semantic payload joins，不拥有新的 timeline truth。

终局判断：

- timeline 是 172 gaps 中最能拉高系统上限的能力，也最不能走捷径。
- 终局 timeline 不只是 event list，而是 event-causal debug record：用户动作、runtime operation、state transition、field transition 和 evidence ref 必须能放到一条可验证时间轴。
- 任何用 latest state 回填历史 item 的实现都应拒绝，即使它能让 demo 看起来可用。

现有实现让道点：

- 如果当前 state read 只能拿 latest state，需要增加 post-commit state watermark 或 state artifact ref。
- 如果现有 event 没有和 state commit 共享 `txnSeq / opSeq / linkId`，应调整事务/事件写入点。
- 如果 field metadata 只存在于 field kernel 内部 plan，而不出现在 event 上，应补 field event metadata source。

优先级：closed projection.

建议终局形态：

- timeline 从 operation ledger 投影。
- 每个 item 可携带 `stateAfterRef`、`stateAfterPreview`、`fieldChanges`、`diagnosticRefs`、`processRefs`。
- `stateAfter` 只来自 recorded post-event state、event-carried state artifact ref，或 watermark 精确匹配该 item 的 current head。
- field timeline 只使用 field-runtime owner 提供的 field event metadata。

需要内核改造：

- 事务提交后生成 post-state artifact ref 或 digest watermark。
- state snapshot 与 event ledger 在同一 transaction boundary 内关联。
- field writes、field converge、async source settle 需要可选地写入 slim field event metadata。
- 建立 stateAfter budget、redaction 和 artifact persistence 策略。

验收重点：

- 历史 timeline item 的 `stateAfter` 不会随 latest state 改变。
- 缺 post-state source 时返回 item-level gap，而不是整条命令伪成功。
- field filter 能定位真实 field event metadata。

# Field-Runtime Inspect Model

涉及 rows：`R172-015`、`R172-016`、`R172-017`、`R172-018`，并支撑 `R172-012`。

当前状态：closed by 176, then consumed by 177/178.

176 已关闭 final field list、field identity digest、field graph semantic adjacency、latest field summary、field convergence summary 和 field semantic metadata payload。177/178 只消费这些 owner facts。

终局判断：

- field list、field graph、field summary、field converge 和 field timeline metadata 不应分散补。
- 它们应来自一个 field-runtime inspect model。这个 model 是 field-runtime 的 owner-side debug projection，不是 raw `FieldProgram` 对外泄漏。
- 现有 FieldProgram、plan、field paths 可以作为材料，但不能成为直接输出合同。

现有实现让道点：

- `ModuleFieldsRegistry` 当前更像 debug/devtools registry。若它不能表达 target/instance lifecycle，应下沉或替换为 field-runtime owner accessor。
- field kernel build 里的 raw plan 如果使用 raw-like node/edge identity，应增加 semantic projection 层。
- 如果 source path、deps、writer metadata 缺 digest guard，应降级或补 digest source，而不是输出不稳定路径。

优先级：closed foundation.

建议终局形态：

- field-runtime 提供 repo-internal inspect projection。
- `fields` 输出 final field list、writer/evaluator kind、field identity digest、source digest guard。
- `field-graph` 输出 fieldPath-keyed semantic adjacency，不输出 raw `nodes/edges/from/to`。
- `field-summary` 输出 target-scoped latest field summary。
- `summary` 的 field converge topN 与 `field-summary` 复用同一 source。
- field timeline metadata 由 field-runtime 写入或投影到 operation ledger。

需要内核改造：

- target/module/instance 到 field program 的稳定 owner binding。
- field identity digest 和 fieldPath stability rule。
- latest field summary by target/instance 的 lifecycle。
- field graph budget、dropped relation、degraded reason。
- field event metadata 与 runtime operation ledger 的 join key。

验收重点：

- 有 field program 的 target 能返回 fields 和 field graph。
- field graph 只表达 semantic adjacency。
- field summary 与 operation summary 共享 field-runtime source。
- 缺稳定 field identity 时 degraded 或 gap，不合成临时 ID。

# Operation Summary

涉及 rows：`R172-013`、`R172-014`、`R172-015`。

当前状态：closed by 178.

178 已实现 summary composition；operation slice 来自 175 operation window，field converge slice 来自 176 field summary。缺 owner input 时仍可产生 owner-coded gap，但 coverage harness 已不再把 summary fact family 记为 structured-gap row。

终局判断：

- operation summary 不应是一个单独聚合器。
- 它应是 operation ledger 与 field-runtime inspect model 的组合投影。
- 它的价值在于给 Agent 快速判断“最近发生了什么、哪类事实在抖、是否有退化”，不是复刻 DevTools 面板上的统计卡片。

现有实现让道点：

- 如果 summary 只能从 React UI state 或 browser console 推导，应删除这条路径。
- 如果 field converge 只能从 raw field events 临时聚合，应回到 field-runtime summary source。

优先级：closed projection.

建议终局形态：

- 输出 recent operation count、txn count、event kind counts、latest operation marker、field converge topN、degraded reasons。
- React render/selector count 不属于这个 P1 summary，继续归 future react-host evidence。
- summary payload 必须引用 source windows 或 artifact refs，便于 evidence export。

验收重点：

- summary 可追溯到 operation ledger 和 field-runtime source。
- 缺 field source 时只降级 field 部分。
- 不包含 React render count、verification verdict 或 repair hints。

# Diagnostics Events

涉及 row：`R172-019`。

当前状态：179 已关闭为 owner-backed。

终局判断：

- diagnostics 应成为 operation ledger 的一等 kind，而不是 console sink 的文本输出。
- 诊断事件必须 slim、可序列化、可比较，并带 target/txn/op 归属。

现有实现让道点：

- Console-oriented DebugSink 输出不能直接作为 machine fact。
- raw error、stack、大型 payload 应转 artifact ref、redaction 或 digest。

优先级：Closed by 179。后续只在诊断 taxonomy、payload budget 或 owner law 变化时 reopen。

建议终局形态：

- diagnostic event 包含 code、severity、summary、target、txnSeq/opSeq、artifactRef 或 redacted marker。
- trace 级高频事件默认 sampling 或 dropped marker。
- diagnostics 不产生 repair verdict，只提供 evidence。

验收重点：

- `events --kind diagnostic` 返回 owner-backed event window。
- payload JSON-safe，不含 raw Error object。
- disabled path overhead 可证明。

# Process Events

涉及 row：`R172-020`。

当前状态：179 已关闭为 owner-backed source bridge；完整 process taxonomy 仍可按独立 owner law 后续增强。

终局判断：

- process/effect events 应成为 operation ledger 的一等 kind，但完整能力需要 runtime process taxonomy。
- 第一目标不是把 Effect/fiber internals 暴露出来，而是让 Agent 能知道哪个 process 被什么触发、何时 settle、是否失败、和哪个 txn/op 相关。

现有实现让道点：

- 如果当前 process protocol 只适合内部调度，不适合诊断输出，应增加 projection event，而不是输出内部对象。
- reflection enrich 只能引用 binding ref 或 static summary ref，不能复制 manifest。

优先级：Closed by 179 for source bridge。若要扩展 triggered/settled/cancelled 等更完整 process taxonomy，应新开需求，不回退 179 的 runtime-live owner law。

建议终局形态：

- process event taxonomy 至少包含 triggered、started、settled、failed、cancelled。
- event payload 包含 process id/digest、trigger source、txnSeq/opSeq、summary、artifactRef。
- static context join 只通过 reflection binding ref。

需要内核改造：

- process lifecycle event boundary。
- async settle 与 transaction/window 的关联。
- resource/process high-cardinality budget。

验收重点：

- process events 能按 target 过滤。
- 不暴露 Effect、Fiber、Layer 或 resource handle。
- static context 缺失时 degraded，不阻塞 runtime-owned event。

# React Host Evidence

涉及 row：`R172-023`。

当前状态：P2 deferred。

终局判断：

- React host evidence 有价值，但不应作为 runtime inspect gaps 的替代品。
- 它的终局 owner 是 React host debug events，关注 selector/render identity 与 txn linkage。
- 它不能从 React DevTools UI state 或组件局部状态里反推 runtime truth。

现有实现让道点：

- 如果 useSelector debug metadata 只用于 DevTools UI，应调整为 host evidence event producer。
- selector/render evidence 要和 runtime ledger 通过 txn/linkId 对齐，不能形成第二时间轴。

优先级：Deferred-Core。等 operation ledger 稳定后另开 spec。

建议终局形态：

- React host events 写入独立 host evidence owner，并可通过 ledger link 对齐。
- 输出 selector id/digest、render boundary、selected field paths、txn linkage、budget/degraded markers。
- 只作为 explainability evidence，不作为 runtime state truth。

# Profile Summary

涉及 row：`R172-024`。

当前状态：P2 deferred。

终局判断：

- profiling 是 local profiler owner 的职责，不属于 runtime inspect ledger 的第一阶段。
- 它需要授权、预算、采样、redaction 和 overhead proof。
- 不应因为 CLI 有 live bridge 就顺手把浏览器 CPU/heap profiling 混入 172 data plane。

优先级：Deferred。独立 spec。

建议终局形态：

- local-only profiler owner 输出 bounded profile summary。
- profile artifact 与 runtime ledger 只能通过 time/target/link refs 关联，不共享 fact authority。

# Post-179 Closure Priority

已完成的第一层 owner 基础：

- Reflection live binding model：174 closed。
- Runtime-live operation ledger：175 closed。
- Field-runtime inspect model：176 closed。

已完成的第二层核心投影：

- Event window：175 closed。
- Field list：176 closed。
- Field graph：176 closed。
- Diagnostics events：179 closed。
- Operation summary：178 closed。

已完成的第三层时序或 lifecycle 投影：

- Field summary：176 closed。
- Field converge summary：178 closed over 176。
- Process events：179 closed for source bridge；完整 process lifecycle taxonomy 可在新 owner law 下另议。
- Timeline stateAfter：177 closed。
- Field timeline metadata：177 closed over 176 field semantic joins。

仍 deferred 的第四层：

- React host evidence owner。
- Profile summary / local profiler owner。

# 后续需求拆分建议

后续不建议把 deferred backlog 塞进 172/173，也不建议为了“清零”强行开 180/181。只有当 SSoT 18 的 reopen bar 满足，才按 owner model 拆：

- `react-host-evidence-owner`：单独处理 selector/render evidence。promotion 前必须证明 ledger link rules stable、host evidence cannot become Runtime truth、selector/render identity has disabled-overhead proof。
- `local-profiler-owner`：单独处理 profile summary。promotion 前必须冻结 profiler owner、authorization、budget、redaction 和 target/time/link ref law。

拆分原则：

- 按 owner producer 拆，不按 CLI 命令拆。
- 新需求允许挑战现有实现、替换临时 producer、调整内核事件模型。
- 每个需求必须证明 disabled-overhead、budget/redaction、target identity、lifecycle cleanup 和 evidence export。
- CLI、daemon、browser adapter、Workbench 只消费 artifact/gap，不拥有事实。
