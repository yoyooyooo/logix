# Spec Registry: Runtime Package Cutover（112 总控）

## SSoT

- 关系事实源：`specs/112-runtime-package-cutover-roadmap/spec-registry.json`
- 人读说明：`specs/112-runtime-package-cutover-roadmap/spec-registry.md`

约定：

- 关系与状态只认 json
- 本文件只做人读解释，不引入 json 里没有的关系

## 当前执行态

- `113` 已完成 docs root route、governance、runtime/platform facts cutover
- `114` 已完成 package inventory、policy、family templates、archive protocol
- `115` 已完成 kernel boundary、support matrix 与第一层 shell surface 收口
- `116` 已完成宿主包第一轮重启
- `118` 已完成 control-plane CLI 第一轮重启
- `117` 已完成领域包第一轮重启
- `119` 已完成 examples / verification 收口

## 统一口径

- 现有子包按存量材料处理，不按兼容目标处理
- 差异过大的包允许改名封存，再从 0 到 1 重建
- 已经对齐目标契约的热链路、协议、helper 与测试资产优先复用或平移
- `@logixjs/core` 这一轮必须显式下沉 `kernel`
- docs、package topology、examples、verification 必须联动规划

## Member Specs

| ID | 主题 | 依赖 | 状态 |
| --- | --- | --- | --- |
| 113 | docs 与 runtime facts cutover | - | done |
| 114 | 全仓子包 reset 政策与文件结构约束 | - | done |
| 115 | core kernel 下沉与拓扑重排 | 113, 114 | done |
| 116 | host runtime 相关包重启 | 114, 115 | done |
| 117 | domain 包重启 | 114, 115 | done |
| 118 | CLI 重启 | 113, 114, 115 | done |
| 119 | examples 与 verification 收口 | 113, 115, 116, 117, 118 | done |

## 推进顺序

1. 先完成 113 与 114，锁定文档事实源和包处置政策。
2. 再完成 115，给 kernel、public surface、internal cluster 定边界。
3. 然后并行推进 116、117、118。
4. 最后用 119 把 examples、verification、docs 锚点收口。

## 当前证据

- `113` 的 tasks 已全部完成，`docs/next/2026-04-05-runtime-docs-followups.md` 已成为统一 followup bucket
- `114` 的 tasks 已全部完成，policy inventory、reuse ledger、family templates、archive protocol 已齐备
- `115` 的 kernel boundary、support matrix、实验层裁决与定向验证已完成；实验能力已并回 `@logixjs/core/repo-internal/kernel-api`
- `116` 的 5 份宿主边界测试和宿主包 typecheck 已跑通，docs / templates / role matrix 已对齐
- `117` 的 4 个领域包边界测试和 typecheck 已跑通，docs / templates / role matrix 已对齐
- `118` 的新命令面、输出契约与全量 CLI tests/typecheck 已跑通
- `119` 的 inventory、anchor map、verification 子树与 pattern reuse 审计已跑通
- `112` 自身的 registry、tasks、group checklist 现已与实际完成态一致
