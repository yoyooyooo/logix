---
title: Form North Star
status: living
version: 6
---

# Form North Star

## 目标

冻结 Form 在更高北极星下的角色：当 Logix 追求成为 React 的逻辑半边时，Form 只承接输入状态语义，不复制 core 主链、宿主律与证据律。

## 一句话北极星

Form 的终局目标，是成为 Logix logic complement spine 上承接“输入状态语义闭环”的 program-first domain kit：
它补领域 DSL、领域默认行为、领域 diagnostics；它吸收 relevant Logix abilities 的方式，是沿同一条 `Logic / Program / Runtime / host` 主链下沉，而不是在 package 内再复制一套 peer API。

## 主目标

### 1. spine preservation

Form 必须证明自己是 core spine 的领域 specialization：

- `Form.make` 若保留，只能作为 core assembly law 的领域构造 act
- `FormProgram` 只作为 core `Program` 的领域 refinement 理解
- React exact host law 继续由 core 持有
- pure projection family 不回到 Form canonical surface

### 2. 单一声明动作

Form 只允许一个 exact declaration act。
具体拼写由 [13-exact-surface-contract.md](./13-exact-surface-contract.md) 单点持有。

这条约束同时要求：

- 不存在第二 declaration carrier
- 不存在 config-key 与位置参数并存的第二作者面
- 不存在 raw field route 或 expert escape hatch 回流

### 3. 单一领域句柄

Form 只拥有一条 effectful domain handle：

- form handle 承接 effectful domain commands
- submit 只有一个 canonical noun
- field / list mutation 继续停在同一个 handle 上
- host acquisition 与 pure projection 继续由 core host law 承接

### 4. 同一份真相

Form 必须继续维持单一事实源：

- values tree
- `errors`
- `ui`
- `$form`

Form 不得为了 host convenience 长出第二套 field state、第二套 task state、第二套 submit state。

### 5. canonical grammar 固定为三件事

Form 的终局语义，只按下面三件事理解：

- `active-shape lane`
- `settlement lane`
- `reason contract`

其中：

- `active-shape lane` 承接 presence、结构编辑、cleanup、ownership
- `settlement lane` 承接 async validation、submit、decode、blocking
- `reason contract` 承接 reasons、evidence、blocking vocabulary 与最小 verdict summary 的唯一 authority

### 6. 单一证据链

reason / evidence 只允许沿同一条链路传播：

- kernel 产出 canonical reasons / evidence
- Form 负责领域语义与领域句柄
- host 与 trial 通过 core host / control-plane law 消费同一条链

### 7. program-first，host owner 在 core

Form 是 program-first 领域包。
它返回 program-compatible blueprint，并与 core spine 保持同一条 execution 模型。

这意味着：

- React host owner 继续停在 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- tutorial 与 convenience sugar 不能反向定义 core contract
- 复用与组合默认通过 returned `FormProgram` 完成
- Form 不拥有 canonical React hook family

### 8. AI Native first

Form 的设计优先服务：

- Agent 更容易生成正确作者面
- Agent 生成出来的代码对人类也尽量低心智、可读、可复述
- Agent 更容易理解 invalid / pending / cleanup / stale-drop 的原因
- Agent 更容易做 scenario-based verification

如果某个设计只增加熟悉度，却让 Agent authoring、runtime clarity 或 diagnostics 变差，默认拒绝。
如果某个公开词必须靠大量 gloss 才能讲通，也默认视为 design debt，而不是只当文案问题。

### 9. 竞争口径固定为“更少系统分裂”

Form 当前不以“全面超越 Vue / Angular / TanStack Form 这类成熟生态”作为短期目标。

Form 当前更合理的竞争口径固定为：

- 在最难的复合场景里
- 用更少的系统分裂
- 用更少的 glue
- 用更强的 owner clarity
- 用更强的 diagnostics 解释力
- 收成一个更统一的小模型

这意味着：

- 不把“零件更全”当成当前主目标
- 不把“功能总数更多”当成当前主目标
- 不把“和成熟框架表面对齐”当成当前主目标

当前更值得追求的是：

- remote fact、本地协调、rule gate、submit、reason、diagnostics 能否落在同一组 owner law 上
- 作者是否还需要在组件、query、form、host 之间写额外 glue
- 复杂 row-heavy 场景下是否还能保持单一真相与单一解释链

### 10. law 优先于零件完备

Form 当前优先争取的，不是“把成熟生态里的强零件逐个补齐”。

Form 当前优先争取的是：

- law 更统一
- owner 更清楚
- 系统分裂更少
- diagnostics 更容易回链

若一个方案只是提供更多零件，却继续依赖多层 glue、多条真相或多条解释面，它不构成当前北极星上的进展。

### 10.5. 公开词必须低心智且内外一致

Form 继续消费 repo 级 API 命名原则：

- public API noun 必须尽量能被低心智语言稳定解释
- 一个公开 noun 只允许一个主角色
- exact noun 与用户文档主叙事尽量共用同一套词
- 内部精确术语可以保留，但不得压过用户看到的 API 词

所以 Form 这条子树后续默认要同时满足两件事：

- Agent 更容易稳定生成
- 人类第一次读生成结果时，也能较低心智地读懂

### 11. 顶层方向的合法重开条件

未来当然允许出现挑战当前主方向的新方向。

但这类重开只允许由下面两类证据触发：

- 现有主方向在核心复合 proof 上确实承接不了
- 新方向在更少概念、更少公开面、更强 proof、更少 second-system 风险上形成严格改进

局部不顺手、命名偏好、单点人体工程学收益，不足以触发顶层重开。

已经冻结出来的 law 若跨方向可复用，后续 challenger 必须复用它们，不能绕开重来。

### 12. 先冻可优化边界，再用运行证据逼近内核最优

Form 当前不要求在顶层 API 设计阶段就同时得到“API 最优 + 内核最优”的双重完美答案。

当前更合理的阶段目标是：

- 先冻结 owner boundary
- 先冻结单一真相
- 先冻结 canonical read route
- 先冻结 diagnostics / evidence law
- 先确保未来仍有性能优化空间

然后再基于真实可运行逻辑去补：

- trace
- benchmark
- row-heavy proof
- clear / retire / reorder / replace 的真实证据

这条原则同时要求：

- 不因为“性能以后还能调”就接受明显会锁死优化路线的公开 API
- 不因为“内核现在还没证明最优”就推迟所有顶层方向判断
- 任何顶层方向只要一开始就明显妨碍热路径收缩、证据回链或第二系统清理，默认拒绝

## 核心成功标准

### 1. `spine-preservation`

- Form 的 noun 都能回链到同一条 `Logic / Program / Runtime / host` spine
- 领域包没有第二套 assembly law
- 领域包没有第二套 host truth

### 2. `authoring-determinism`

- Agent 只需学习一个 declaration act
- declaration carrier 不分叉
- exact spellings 只出现在单点权威页

### 3. `evidence-determinism`

- invalid / pending / cleanup / stale-drop 都能回到同一条 reason / evidence 链
- host 与 verification 不再各自发明第二套 projection truth

### 4. `future-headroom`

- 新能力优先收进现有三条 root grammar
- 新 noun 默认拒绝，除非能删掉旧 boundary、旧 alias 或旧特例
- kernel 约束只能支撑更小的 public contract，不能倒逼 public 面变大
- 顶层 challenger 默认先证明自己减少系统分裂，再证明自己增加了什么能力
- 顶层 challenger 还必须证明自己给后续性能优化留了空间，而不是一开始就把热路径与证据链锁死

## 非目标

### 1. 不追求 RHF API 对等

Form 不以 `register / Controller / FormProvider / useWatch` 的一比一表面对齐为目标。

### 2. 不回退到 raw field authoring

Form 不再重开第二套 raw field route。

### 3. 不把 host sugar 误当核心进展

React projection 可以继续增强，但 host sugar 不占 canonical owner。

### 4. 不把“吸收更多能力”理解成“复制更多 facade”

Form 可以吸收 relevant Logix abilities；它们必须沿同一条主链下沉。

## 相关裁决

- [2026-04-04 Logix API Next Charter](../../adr/2026-04-04-logix-api-next-charter.md)
- [2026-04-05 AI Native Runtime First Charter](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [2026-04-12 Field Kernel Declaration Cutover](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- [./13-exact-surface-contract.md](./13-exact-surface-contract.md)
- [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- [../runtime/05-logic-composition-and-override.md](../runtime/05-logic-composition-and-override.md)
- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)
- [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)

## 当前一句话结论

Form 的北极星已经上提到“spine preservation”：Logix 追求成为 React 的逻辑半边时，Form 只冻结领域 DSL、领域句柄与领域默认行为；host law、composition law 与 core owner 继续回到同一条 Logix 主链。
