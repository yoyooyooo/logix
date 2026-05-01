---
title: AI Native Runtime First Charter
status: accepted
date: 2026-04-05
---

# AI Native Runtime First Charter

## 决策

当前仓库进入下一轮激进改造期，并固定以下总原则：

- AI Native first
- Agent-first 的默认成功标准，同时包含 Agent 生成稳定性与人类首读可理解性
- Logix 当前核心目标，是成为 React 的逻辑半边：React 负责 UI / host / render，Logix 负责 declaration / composition / execution / evidence
- 更远大的目标不等于更大的公开面；越接近“逻辑半边”，越要求公开主链、宿主律、证据链与领域包 owner law 统一
- 平台化不是当前硬目标；若平台存在感与 API 清晰度、Agent 可用性、性能、可诊断性冲突，优先后者
- 当前阶段默认以面向未来的最优设计为目标，在当下认知范围内追求极致收口；已有实现、既有 spec、现有北极星与治理口径都可被修订、替换或删除
- 静态化只做必要部分；只有能直接换来类型边界、安装期验证、稳定诊断、可复现证据的静态化才值得保留
- 为平台叙事、表面完备度或未来假设服务的过度锚点、过度 profile、额外壳层、第二模型，默认删除或后置
- 北极星、charter、guardrails 与阶段性路线图都只是对齐载体；当它们阻碍更小、更一致、更可推导、更高性能、更可诊断的方案时，先更新事实源，再继续推进
- 与成熟生态对比时，当前不以“零件更全、工具更多、场景更广”作为主要胜负标准；当前主要竞争口径固定为：在最难的复合场景里，用更少的系统分裂、更少的 glue、更强的 owner clarity 与更强的 diagnostics 解释力，收成一个更统一的小模型
- 若某个方案只是把现有强零件继续拼接得更全，却不能减少系统分裂、减少 glue、减少第二习惯用法或提高 diagnostics 解释力，默认不视为主线胜利
- public API 词若长期无法被稳定翻成低心智解释，应视为设计债，而不是单纯文案问题
- 一个公开 noun 只允许一个主角色；内部精确术语不得回流成用户文档主叙事
- 后续若出现新主方向，它必须靠更强 witness 与更严格的支配证据触发，不得靠局部不顺手、命名偏好或对成熟生态的表面对齐触发
- 新旧 surface 都必须降到同一个 runtime 主线，不得长出第二套 runtime、事务语义或调试事实源
- React host exact law 由 core 持有；领域包若保留 convenience sugar，只能是 identity-preserving 的薄别名，不得拥有 canonical host family 或 pure projection family
- 领域包只能作为这条主链的 program-first 或 service-first 投影；“吸收更多 Logix 能力”只允许沿同一条 `Logic / Program / Runtime / host` spine 下沉
- 文档可以领先代码；在当前改造期内，若旧实现与新 SSoT 冲突，以新事实源为准
- 主分支以 Effect V4 为唯一目标版本，所有新代码、新测试、新文档默认按 V4 写
- 当前公开主公式继续收敛为：`Module / Logic` 提供 definition-time assets，`Program` 负责 assembly-time business unit，`Runtime` 负责 execution-time container
- `Program.capabilities.imports` 的公开面只接受 `Program`

## 后果

- 后续所有 runtime 与 authoring 设计，都要先回答它是否直接改善 Agent authoring、runtime clarity、performance 或 diagnostics
- 后续所有 public API 设计，都要额外回答它是否同时降低了人类首读心智成本；若不能，必须明确记为 design debt 或继续收口
- 评审一个顶层方向是否成立时，必须额外回答：它是否减少了系统分裂、减少了业务 glue、减少了第二真相或第二用法；若没有，不能只靠“生态里已有同类零件”或“作者更熟悉”获得通过
- 在 API 设计阶段，优先冻结 owner boundary、单一真相、read law、diagnostics law 与优化 headroom；不要求在这一阶段同时证明内核已经达到最终性能形态
- 但任何公开 API 也不得锁死后续优化路线：若某个方向一开始就迫使未来无法继续压缩热路径、无法去掉第二系统、无法建立稳定 trace/benchmark 证据，默认直接拒绝
- 性能最终必须靠真实可运行逻辑、真实 trace、真实 benchmark 证明；不能只靠 API 美感或静态推理宣称已经最优
- 任何方案评审都必须允许重审既有北极星、既有 spec 与治理口径，不得把它们当成不可动前提
- `docs/ssot/platform/` 仍保留目录名，但它承接的是跨层结构事实，不代表“平台优先”战略
- 与 V3、旧平台化、旧锚点化有关的历史残留，只能作为背景材料存在于 `docs/archive/` 或现有代码注释中，不构成当前设计依据
- 任何阻碍公开面压缩、相位收口、runtime clarity、performance 或 diagnostics 的残留，默认直接删除或重写
- 若某个设计无法证明自己的静态收益、诊断收益或运行时收益，默认不进入公开主链
- 验证控制面统一收敛到 `runtime.*`，第一版主干固定为 `runtime.check / runtime.trial / runtime.compare`
- `trial.scenario` 与统一机器报告必须优先服务 Agent 自我验证，不反向长成新的 authoring surface 或第二真相源
- 具体验证控制面规则以 `docs/ssot/runtime/09-verification-control-plane.md` 为准
- 业务概念到主链的映射必须写进 SSoT，并优先服务人和 Agent 的统一理解，而不是留在口头共识里
- 用户文档主叙事默认只允许 `exact noun + 固定白话 gloss`，不允许内部黑话主导用户心智
- 若要挑战领域包北极星或最终用户 API，必须优先检查并按需回写 `runtime/01`、`runtime/05`、`runtime/08`、`runtime/10` 与对应 ADR，再回写领域子树

## 相关页面

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/02-hot-path-direction.md](../ssot/runtime/02-hot-path-direction.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
