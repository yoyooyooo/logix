# Implementation Plan: CLI Host 抽象与 Browser Mock Runner（099）

**Branch**: `099-cli-host-adapters` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)

## Summary

为 `@logixjs/cli` 增加 Host 抽象能力，解决 Node-only 在加载/试跑前端模块时因浏览器 API 失败的问题：

- 新增全局 Host 选择（默认 `node`，新增 `browser-mock`）。
- Host 作用域覆盖“入口加载 + trialrun/contract-suite 执行链路”。
- 将 Host 不匹配/缺少浏览器全局的失败收敛为结构化诊断（含可执行 action）。
- 严格保持 cold path 不加载重依赖（lazy-load browser-mock）。

## Constitution Check

- **统一最小 IR**：本特性不改变 IR 结构；只改变“如何成功加载/试跑”以及失败时的诊断形态。
- **标识去随机化**：不得引入新的随机字段；需要时间/随机时必须在 Host 层显式禁用或注入稳定实现（默认建议直接禁止进入 gating）。
- **事务窗口禁止 IO**：不涉及 runtime 事务语义；Host 适配不得把 IO 混入运行时核心路径。
- **诊断事件 Slim 且可序列化**：Host 相关错误必须 JsonValue-only，且提供稳定 `code` 与最小 action。

## Project Structure

```text
specs/099-cli-host-adapters/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/
    └── public-api.md
```

```text
packages/logix-cli/
├── src/internal/host/**                 # Host 抽象（接口 + 实现）
├── src/internal/loadProgramModule.ts    # 入口加载：在 import 前后应用 Host
└── src/internal/commands/*              # trialrun / contract-suite 等复用入口加载
```

## Design Notes（裁决点）

1. **Host 的职责边界**：只负责“提供/隔离宿主全局与必要 polyfill”，不负责改变 Logix 的语义与 IR。
2. **最小模拟 vs 真实浏览器**：
   - v1：`browser-mock`（Node 内模拟）优先，成本最低；实现建议复用仓库已使用的 `happy-dom`（减少引入新依赖的风险）。
   - vNext：如需 Playwright/真实浏览器，必须另立 spec，并给出 CI 成本与稳定性证据。
3. **隔离策略**：
   - 每次命令执行：`install()` → 执行 → `restore()`；
   - 必须覆盖最常见的全局（`globalThis.window` 等），且恢复要可验证（测试断言）。
4. **冷启动约束**：browser-mock 依赖必须只在 `--host browser-mock` 且确实走到“入口加载”路径时 dynamic import。
5. **配置收口**：`logix.cli.json` 允许新增 `host` 默认值（建议仍为 schemaVersion=1 的增量扩展：在 validator 的 `knownKeys` 中加入 `host`），以保持“严格 schema + forward-only”策略。

## Cross-Reference（需要同步的对外合同）

- 085 CLI 全局参数需要新增 `--host`（或至少在 085 合同里引用本 spec）：`specs/085-logix-cli-node-only/contracts/public-api.md`
- `logix.cli.json` 的 schema 校验（`packages/logix-cli/src/internal/cliConfig.ts`）需要允许 `host` 字段，否则配置无法透传到 argv 前缀

## Perf Evidence Plan

- **Cold path**：延续 085 的 `measure:startup` 口径，确保 `logix --help` 不受影响（不引入 browser-mock 的加载）。
- **Host overhead**：对同一入口对比 `node` vs `browser-mock` 的 trialrun 运行时间（只做趋势性证据；不作为门禁）。

## Rollout / Migration

- 默认行为不变：不传 `--host` 仍为 `node`。
- `logix.cli.json` 若新增 `host` 默认值，必须遵守“argv last-wins”，且必须保持 strict schema（未知字段仍报错）。
