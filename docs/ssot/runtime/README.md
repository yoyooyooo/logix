---
title: Runtime SSoT Root
status: living
version: 18
---

# Runtime SSoT Root

本目录用于重新生长新的运行时事实源。

## 当前状态

- 历史 runtime SSoT 基线在 `docs/archive/ssot/runtime/`
- 新 runtime SSoT 从当前目录重新建立
- 当前覆盖矩阵里的 runtime spine、React host law 与 verification control-plane 片段已汇总到 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)

## 当前角色

- 本页负责 runtime 子树导航与 owner 路由
- Form 的独立领域树已迁到 `../form/README.md`
- 叶子页负责唯一语义，本页不重复定义正文

## 当前入口

| 页面 | 主题 | Owner Spec |
| --- | --- | --- |
| [01-public-api-spine.md](./01-public-api-spine.md) | 公开主链与 surviving surface | `122 + 170` |
| [02-hot-path-direction.md](./02-hot-path-direction.md) | kernel hot path 与 perf direction | `123` |
| [03-canonical-authoring.md](./03-canonical-authoring.md) | `Module / Logic / Program` canonical authoring | `122 + 170` |
| [04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md) | capabilities 与 runtime control plane | `124` |
| [05-logic-composition-and-override.md](./05-logic-composition-and-override.md) | logic composition 与 override 边界 | `122 + 170` |
| [06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md) | form 与 field-kernel 的 boundary page | `125` |
| [07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md) | host scenario patterns 与 examples 映射 | `126` |
| [08-domain-packages.md](./08-domain-packages.md) | domain package 分类与准入边界 | `127` |
| [09-verification-control-plane.md](./09-verification-control-plane.md) | verification stages、input contract、machine report、startup readiness evidence | `124 + 170` |
| [10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md) | `RuntimeProvider / Program / ModuleRuntime / ModuleTag` 的 React 宿主边界与 observation-only error sink | `134 + 170` |
| [11-toolkit-layer.md](./11-toolkit-layer.md) | 官方 toolkit 二层的定位、边界、准入门禁与 Agent First 约束 | `147` |
| [12-toolkit-candidate-intake.md](./12-toolkit-candidate-intake.md) | toolkit 候选提炼的长期 intake 协议与分类法 | `147` |
| [13-selector-type-safety-ceiling-matrix.md](./13-selector-type-safety-ceiling-matrix.md) | canonical selector shapes 的理论类型安全上限、blocker 与 reopen trigger | `134 + capability/02` |
| [14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md) | DVTools 作为内部证据解释工作台的北极星、边界、职责与删除方向 | `159` |
| [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md) | CLI 作为 Agent First runtime control-plane route 的北极星、命令面、输入输出协议与删除方向 | `160` |
| [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md) | Agent 自验证闭环终局压力矩阵，特别承接装配漏加、依赖漏注入、CLI 缺口与内核反压清单 | `SSoT` |
| [17-playground-product-workbench.md](./17-playground-product-workbench.md) | Playground 作为用户可见运行时工作台的能力、权威分层与界面展示方式 | `164 + 165` |

## 当前优先入口

- 公开主链：`01-public-api-spine.md`
- hot path 方向：`02-hot-path-direction.md`
- control plane：`04-capabilities-and-runtime-control-plane.md`
- form 边界：`06-form-field-kernel-boundary.md`
- 验证控制面：`09-verification-control-plane.md`
- React 宿主边界：`10-react-host-projection-boundary.md`
- selector 类型安全上限：`13-selector-type-safety-ceiling-matrix.md`
- DVTools 内部工作台：`14-dvtools-internal-workbench.md`
- CLI Agent First 控制面：`15-cli-agent-first-control-plane.md`
- Agent 自验证终局压力矩阵：`16-agent-self-verification-scenario-matrix.md`
- Playground 产品工作台：`17-playground-product-workbench.md`
- toolkit 二层：`11-toolkit-layer.md`
- toolkit intake：`12-toolkit-candidate-intake.md`
- 当前冻结 API 形状：`../capability/03-frozen-api-shape.md`

当前 canonical verification facade：

- `Runtime.check(Program, options?)`
- `Runtime.trial(Program, options)`

当前 result face：

- `Runtime.run(Program, main, options)`

## 相关裁决

- [2026-04-04 Logix API Next Charter](../../adr/2026-04-04-logix-api-next-charter.md)
- [2026-04-05 AI Native Runtime First Charter](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [2026-04-12 Field Kernel Declaration Cutover](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [Docs Governance](../../standards/docs-governance.md)
- [Logix API Next Guardrails](../../standards/logix-api-next-guardrails.md)
- [Effect V4 Baseline](../../standards/effect-v4-baseline.md)

## 导航说明

- 写 runtime 事实前，先选唯一 owner page
- Form 领域语义优先写到 `../form/**`；只有跨层 boundary 继续落在 `06`
- 子页新增、删除或重排时，先回写本页和 `docs/ssot/README.md`
- 若未来出现活跃收尾专题，再回看 [../../next/README.md](../../next/README.md)

## 当前一句话结论

本页负责 runtime 子树导航与 owner 路由；当前覆盖矩阵的冻结 API 形状看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)，具体规则进入对应 leaf page。
