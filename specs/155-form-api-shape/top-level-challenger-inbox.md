# Top-Level Challenger Inbox

**Role**: 未升格顶层方向雷达  
**Status**: Living Working Artifact  
**Feature**: [spec.md](./spec.md)  
**Active Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Purpose

本文件承接未升格的顶层方向种子。

它的目标不是替换 `AC3.3`，而是持续提供两类价值：

- 识别可能成为未来 `AC*` 的新主方向
- 即使方向失败，也把反哺点回写成 `AC3.3` 的 guardrail、negative evidence 或 reopen trigger

## Rules

- 本文件不等于 candidate
- 本文件不替换 active candidate
- 每个方向必须写 `feedback to AC3.3`
- 只有通过 preflight gate，才允许升格成 `candidate-ac4-*.md`
- 未通过 preflight 的方向只保留为 `H*` 条目
- 若某个方向只适合作为评审判定器，可保留为 `review overlay`，不进入 public contract 搜索空间
- 已被硬拒绝的方向可以保留，但必须写清楚“为什么不能复活”

## Preflight Gate

一个方向种子只有同时满足下面条件，才允许升格为正式候选：

1. 它是顶层骨架，不是 helper / spelling / local patch
2. 它能删除 `AC3.3` 的某个公开概念、边界或翻译层
3. 它能吸收 `S1 / S2 / C003` 已冻结 law
4. 它能减少系统分裂、glue、第二真相或第二习惯用法
5. 它不会锁死后续 runtime hot path / trace / benchmark 优化空间
6. 它能给出完整 public contract sketch

## H001 Field Fact Lane

- idea:
  - 用 `field-owned local facts` 替代 `companion` 叙事
- possible upside:
  - authoring / read / diagnostics 的语言更统一
  - `source -> fact -> patch -> reason` 的解释更直
- blocker:
  - `fact` 语义过宽，容易吸入 `reason / settlement / meta / values`
  - `derive` 容易回到 `watch / computed`
- feedback to AC3.3:
  - `companion` 的价值不只是命名，而是隔离 local soft fact 语义域
  - `lower` 虽然偏 runtime，但比 `derive` 更能避开 computed 心智
  - `availability / candidates` 的 sealed slot law 必须继续保持
- promotion trigger:
  - 能证明 `fact` 边界不弱于 `companion`
  - 能证明它删除的是一层公开翻译，而不是只换词
  - 能在 owner law / read law / diagnostics law 三线同时强于 `AC3.3`
- status:
  - parked lexical challenger

## H002 No Public Companion

- idea:
  - 不公开 `field().companion`，把 soft fact 留在 Program / Module internal lane
- possible upside:
  - public surface 更小
  - 看似更贴合当前 exact authority
- blocker:
  - internal lane 会变成 shadow system
  - read-route 与 diagnostics 证明义务不会消失，只会更隐蔽
- feedback to AC3.3:
  - 若能力必须被 author 直接声明，公开 owner-attached law 比 hidden internal lane 更诚实
  - `dsl/internal` 不能替代可解释的 owner law
- promotion trigger:
  - 能证明 internal lane 只是编译期糖
  - 能证明 read-route 与 diagnostics 不弱于 `AC3.3`
  - 能证明不会形成第二系统
- status:
  - rejected for now

## H003 Field Slot Projection

- idea:
  - 用 `field-owned slot projection lane` 替代 `companion`
- possible upside:
  - 更贴近 read law 的 owner-first slot projection
  - 更贴近 diagnostics 的 projection/patch 语言
- blocker:
  - `projection` 已由 React host / core read law 占用
  - 会把 read-side noun 反灌回 Form authoring
- feedback to AC3.3:
  - read-side law 不应直接变成 authoring noun
  - `projection` 必须继续留在 host/read 语境
- promotion trigger:
  - 几乎无；除非未来 projection 词汇全局重定义
- status:
  - rejected

## H004 Field Capability Block

- idea:
  - 用 `field(path, ($f) => ...)` 聚合 `source / companion / rule`
- possible upside:
  - 同一 field 的能力 co-location 更好
  - 更像 field attachment unit
- blocker:
  - attachment unit 容易被误读成 owner unit
  - `rule` 的 field-local / roster-level 边界会变糊
  - 容易长成 bag-of-hooks
- feedback to AC3.3:
  - co-location 是 DX 问题，不足以重塑 owner law
  - `source / companion / rule` 分开，反而有助于保持 owner split
- promotion trigger:
  - 能证明 field block 只收 attachment，不收 owner truth
  - 能证明不会长第四/第五 lane
- status:
  - rejected

## H005 Field Affordance Lane

- idea:
  - 用 `affordance` 替代 `companion`，只表达交互可达性与候选集
- possible upside:
  - 比 `fact` 窄
  - 与 `availability / candidates` 的 day-one 语义贴近
- blocker:
  - 过度绑定 UI 交互语义
  - 非 affordance 型 local-soft proof 会更早触发 reopen
  - 容易把 `disable / hide / readonly` 这类 host policy 误当 authoring truth
- feedback to AC3.3:
  - `availability` 需要保持 fact，而不是 UI policy
  - `companion` 比 `affordance` 更能容纳非 UI 策略型 soft fact
- promotion trigger:
  - 能证明 day-one 与未来 proof 都属于 affordance，不需要更宽 soft fact skeleton
- status:
  - parked-low

## H006 Field Slice Patch

- idea:
  - 用 `slice({ derive }): write | clear` 直接暴露 patch 语义
- possible upside:
  - `write / clear` 显式，贴近 bundlePatchRef / compare / repair
  - 删除 `undefined => clear` 这个过载约定
- blocker:
  - 把 control-plane / patch 语言倒灌到 day-one authoring
  - public surface 变厚
  - 容易诱发 per-slot patch / merge / registry
- feedback to AC3.3:
  - `undefined => clear` 需要在 diagnostics law 里解释清楚
  - patch 语义更适合 evidence/trace 层，不适合 day-one authoring
- promotion trigger:
  - 实现证据证明 `undefined => clear` 持续遮蔽 `bundlePatchRef`、repair focus 或 compare digest
- status:
  - parked-low

## H007 Owner Matrix / Capability Lattice

- idea:
  - 以 owner matrix 或 capability lattice 组织 API，而不是以 noun 组织
- possible upside:
  - 能更系统地防止 owner 越界
  - 对 future slot / lane 判断更机械
  - 能持续挑战 top-level target function 与 admission law
- blocker:
  - 容易变成设计治理工具，而不是用户-facing contract
  - public authoring surface 可能太抽象
- feedback to AC3.3:
  - `AC3.3` 可以继续消费 owner matrix 作为 review aid
  - 不需要把 matrix 本身升成 public API
- promotion trigger:
  - 能给出比 `field().companion` 更小且更可写的 authoring contract
- status:
  - review-overlay
