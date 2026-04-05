---
title: Logix API Next Guardrails
status: living
version: 3
---

# Logix API Next Guardrails

## 核心护栏

- 零存量用户前提下，允许直接重做 surface、协议与默认行为
- 不写兼容层，不设弃用期，用迁移说明替代
- 新旧 surface 都只能降到同一个 kernel
- runtime core 不感知 surface 来源
- 文档、示例、生成器只认新 canonical API
- 旧名字、旧壳层、旧便利 facade 都不自动继承
- 任何能力若会长出第二模型、第二真相源、第二事务面，默认拒绝
- 不设 `advanced`、`internal` 一类黑盒兜底槽位
- `assign / patch` 做 canonical 写入
- `mutate` 留 expert 层
- `Module / Logic / Program` 默认保留
- `logics: []` 是 canonical 主写法
- `process` 不回 canonical 主链
- Form 保领域层表达
- field-kernel 保底层能力
- 领域包只允许 `service-first` 或 `program-first`
- 领域包不得长出第二套 runtime、DI、事务、调试事实源
- `runtime.check / runtime.trial / runtime.compare` 固定属于 `runtime control plane`
- 这些验证能力不进入公开 authoring surface
- 默认门禁只允许跑到 `runtime.check + runtime.trial(mode="startup")`
- `trial.scenario` 只表达验证意图，不沉淀为正式业务逻辑资产
- `fixtures/env + steps + expect` 是第一版场景验证主入口
- raw evidence / raw trace 不作为第一版默认比较面
- `replay` 与宿主级深验证属于后续升级能力
- `repairHints` 必须是结构化数组，不能只返回自然语言提示
- `nextRecommendedStage` 必须显式返回；当 `verdict = INCONCLUSIVE` 时必须给出唯一推荐的下一层验证入口

## 当前一句话结论

新的公开主链必须持续压缩作者决策分叉；在零存量用户前提下，凡是会拖回旧心智、旧壳层或第二模型的设计，默认直接删或重做。
