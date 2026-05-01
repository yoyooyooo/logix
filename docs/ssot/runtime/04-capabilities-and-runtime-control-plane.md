---
title: Capabilities And Runtime Control Plane
status: living
version: 17
---

# Capabilities And Runtime Control Plane

## 当前规则

`Program.capabilities` 当前只正式承接：

- `services`
- `imports`

当前降落关系：

- `capabilities.services` -> program-level service layers
- `capabilities.imports` -> imported program slot
- `capabilities.imports` 的公开面只接受 `Program`
- 领域包的 engine layer、resource layer 等运行时依赖，只允许通过 `capabilities.services` 或 runtime `layer` overlay 进入，不单独长出新的 capability slot
- orchestration / process / workflow 类残余若仍存在，只允许停在 internal runtime assembly path
- `.impl` 只保留内部蓝图身份，不进入 canonical 装配写法
- 顶层 `imports` 已退出 canonical authoring 写法
- `roots` 已退出 canonical capability surface；若未来需要相关宿主语义，必须单独重开 owner 决策

治理与验证统一收敛到：

- `Runtime.make(Program)`
- `runtime.*`

验证控制面的第一版主干固定为：

- `runtime.check`
- `runtime.trial`
- `runtime.compare`

当前 canonical verification facade：

- `Runtime.trial(Program, options)`
- 旧 observability 试跑 helper 已退出公开 control plane surface
- 旧 observability 试跑 helper 不再作为 public export 提供

它们的边界、默认升级路径和报告契约，以 [09-verification-control-plane.md](./09-verification-control-plane.md) 为准。

Agent 自验证需要尽量发现装配漏加。`services / imports` 的漏注入、漏装配、冲突与结构化报告目标，以 [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md) 的终局压力矩阵反压内核实现。

该矩阵压出的 capabilities / core 实施需求落到 [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)。CLI 只承接 transport 与 rerun closure，具体看 [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)。

来自该矩阵的 capabilities owner 采纳条件：

- `Program.capabilities.imports` 的公开类型与 runtime normalizer 必须收敛到 Program-only。
- invalid import、duplicate import 与 imported child dependency 必须能进入 `runtime.check` 或 `runtime.trial` 的统一 pressure，而不是只在 import-time 或自由文本 error 中暴露。
- service provider source 必须能区分 Program capabilities、runtime overlay 与 host provider；CLI 不因此新增 raw provider overlay public input。

当前 core 实施状态：

- `Program.capabilities.imports` 的公开类型收敛为 Program-only；invalid import 不进入 runtime 装配，只作为 `runtime.check` static finding 暴露。
- duplicate import 不再只依赖 import-time throw；`runtime.check` 通过 `PROGRAM_IMPORT_DUPLICATE` finding 暴露稳定 owner coordinate。
- ModuleTag 形态的 missing service 在 `runtime.trial(mode="startup")` 投射为 `program-import` dependency cause，providerSource 固定为 `program-capabilities`。
- 普通 service/config 缺失仍归 `runtime-overlay` provider source，不让 CLI 获得 raw provider overlay public input。

硬边界：

- 这些能力属于 `runtime control plane`
- 它们不属于公开 authoring surface
- 它们不反向长出新的业务建模入口
- kernel 实验能力当前已回收到 internal owner，不再作为公开 control plane surface

升级层约束：

- 第一版正式主干固定为 `runtime.check / runtime.trial / runtime.compare`
- 更重的升级层判断与输出边界，统一以 `docs/ssot/runtime/09-verification-control-plane.md` 为准

HMR lifecycle negative boundary:

- no new runtime.hmr root command
- no new Runtime.hmr public facade
- no new Runtime.hotLifecycle public facade
- no HMR-specific report protocol
- hot lifecycle evidence must enter the existing evidence envelope as `runtime.hot-lifecycle`

DVTools negative boundary:

- no new runtime.devtools root command
- no new Runtime.devtools public facade
- no new Runtime.inspect public facade
- no DVTools-specific report protocol
- no DVTools-specific evidence envelope
- no DVTools-owned verification lane
- DVTools browser inspection must remain repo-internal or app-local and consume the existing runtime control plane

## package owner 边界

| Package | 角色 | 不负责 |
| --- | --- | --- |
| `@logixjs/core` | 定义 stage、mode、input contract 与 report contract | CLI 命令路由与 browser trial 宿主 |
| `@logixjs/cli` | 暴露 `check / trial / compare` 一级命令面，具体边界看 [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md) | 第二套 verification DSL、第二 report/evidence truth |
| `@logixjs/test` | 暴露 test harness 与 test consumer surface | control plane source-of-truth |
| `@logixjs/sandbox` | 暴露 browser trial surface | 第二 machine report 协议 |
| `@logixjs/devtools-react` | repo-internal / app-local browser inspection workbench | public API、control plane source-of-truth、第二 evidence/report 协议 |

当前共享 contract 落点固定为：

- `@logixjs/core/ControlPlane`

当前 deep internal runtime 的额外约束：

- `Runtime.make(Program)` 不再从 root impl 读取任何公开 authoring corollary 的 `processes / workflows`
- `AppRuntime.makeApp({ processes })` 只属于 internal assembly path
- control-surface / evidence 若仍保留 workflow artifact，也只按 internal control-plane artifact 理解

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)

## 相关规范

- [./01-public-api-spine.md](./01-public-api-spine.md)
- [./02-hot-path-direction.md](./02-hot-path-direction.md)
- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./09-verification-control-plane.md](./09-verification-control-plane.md)
- [./14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md)
- [./15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)
- [./16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)
- [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)
- [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

`Program.capabilities` 在 core 当前只承接 `services / imports`；其中 `imports` 公开面只接受 `Program`；`roots` 已退出 canonical capability surface。治理、验证和比较全部归 `runtime control plane`，并由 `runtime.check / runtime.trial / runtime.compare` 承担第一版主干。
