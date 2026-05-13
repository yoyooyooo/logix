# Spec Registry: Form Cutover Roadmap（140 总控）

## SSoT

- 关系事实源：`specs/140-form-cutover-roadmap/spec-registry.json`
- 人读说明：`specs/140-form-cutover-roadmap/spec-registry.md`

约定：

- member 关系、状态与依赖只认 json
- 本文件提供工作流路由、职责边界与建议顺序
- 后续若新增 member 或调整 scope，md 与 json 必须一起回写

## Existing Baseline

当前 `140` 的实施总控，直接建立在这些 authority 之上：

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`

当前也接受这些 consumed freeze note 作为背景输入：

- `docs/proposals/form-static-ir-trial-contract.md`
- `docs/proposals/form-validation-funnel-export-contract.md`
- `docs/proposals/form-rule-i18n-message-contract.md`
- `docs/proposals/runtime-control-plane-materializer-report-contract.md`

这里的 baseline 只算可修订基线。
若它们阻碍更优设计，当前波次可以直接修订对应事实源。

## Member Specs

| ID | 主题 | 状态 | 依赖 |
| --- | --- | --- | --- |
| `141` | runtime control plane report shell cutover | done | - |
| `142` | form validation bridge cutover | done | `141` |
| `143` | form canonical error carrier cutover | done | `142` |
| `144` | form settlement and submit cutover | done | `142`, `143` |
| `145` | form active-shape and locality cutover | done | `143` |
| `146` | form host/examples/dogfooding cutover | done | `141`, `142`, `143`, `144`, `145` |

## Workstream Routing Matrix

| Topic | Primary Owner Spec | Related Specs | Note |
| --- | --- | --- | --- |
| control plane report shell、repair target、CLI/core/test contract | `141` | - | 先把 runtime/09 exact shell 真正落到代码与 contract tests |
| submit-only decode gate、canonical bridge、adapter path | `142` | `141` | 负责 structural decode 从文档到实现的主切口 |
| `FormErrorLeaf`、raw writeback、`errors.$schema`、string/raw leaf residue | `143` | `142` | 负责 error truth 的单线化 |
| `submitAttempt`、decoded payload、blocking summary、error lifetime | `144` | `142`, `143` | 负责 settlement / submit 的终局收口 |
| row ownership、cleanup、remap、`reasonSlotId.subjectRef` locality | `145` | `143` | 负责 active-shape 与 locality 主线 |
| host consumption、examples、docs、dogfooding cleanup | `146` | `141`, `142`, `143`, `144`, `145` | 只在底层 contract 稳定后推进 |

## Suggested Execution Order

1. 先完成 `141`，把 control plane report shell、repair target 与 artifact linking contract 变成真实实现口径。
2. 再推进 `142`，因为 validation bridge 的实现会直接消费 `141` 的 report/repair contract。
3. 再做 `143`，把 canonical error carrier 真正收成单线。
4. 然后推进 `144` 与 `145`，分别解决 settlement/submit 和 active-shape/locality。
5. 最后推进 `146`，让 React host、examples、docs 和 dogfooding 统一切到新 contract。

## Planning Rule

- `140` 只写总控与路由，不直接承接 member 的 detailed implementation steps。
- 每个 member spec 进入 planning 阶段时，必须固定 5 张表：
  - authority input table
  - file touch matrix
  - residue tombstone
  - verification matrix
  - done definition
- 每个 member spec 先用 SpecKit 生成 `plan.md`。
- detailed implementation plan 统一下沉到 `docs/superpowers/plans/*.md`。
- `tasks.md` 在这类 cutover 工作里只保留薄索引、状态与 acceptance 入口。
- 所有 member 实施都按零兼容、面向未来、单轨实施推进，不保留兼容层、双轨运行、双写、影子路径或弃用期。
