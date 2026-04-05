---
title: AI Native Runtime First Charter
status: accepted
date: 2026-04-05
---

# AI Native Runtime First Charter

## 决策

当前仓库进入下一轮激进改造期，并固定以下总原则：

- AI Native first
- Logix 当前核心目标，是成为 React 的逻辑层补充，稳定支撑 Agent authoring、组合、调试、验证与运行时治理
- 平台化不是当前硬目标；若平台存在感与 API 清晰度、Agent 可用性、性能、可诊断性冲突，优先后者
- 静态化只做必要部分；只有能直接换来类型边界、安装期验证、稳定诊断、可复现证据的静态化才值得保留
- 为平台叙事、表面完备度或未来假设服务的过度锚点、过度 profile、额外壳层、第二模型，默认删除或后置
- 新旧 surface 都必须降到同一个 runtime 主线，不得长出第二套 runtime、事务语义或调试事实源
- 文档可以领先代码；在当前改造期内，若旧实现与新 SSoT 冲突，以新事实源为准
- 主分支以 Effect V4 为唯一目标版本，所有新代码、新测试、新文档默认按 V4 写

## 后果

- 后续所有 runtime 与 authoring 设计，都要先回答它是否直接改善 Agent authoring、runtime clarity、performance 或 diagnostics
- `docs/ssot/platform/` 仍保留目录名，但它承接的是跨层结构事实，不代表“平台优先”战略
- 与 V3、旧平台化、旧锚点化有关的历史残留，只能作为背景材料存在于 `docs/legacy/` 或现有代码注释中，不构成当前设计依据
- 若某个设计无法证明自己的静态收益、诊断收益或运行时收益，默认不进入公开主链
- 验证控制面统一收敛到 `runtime.*`，第一版主干固定为 `runtime.check / runtime.trial / runtime.compare`
- `trial.scenario` 与统一机器报告必须优先服务 Agent 自我验证，不反向长成新的 authoring surface 或第二真相源
- 具体验证控制面规则以 `docs/ssot/runtime/09-verification-control-plane.md` 为准
