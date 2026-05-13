# Implementation Plan: Core Spine Aggressive Cutover

**Branch**: `133-core-spine-aggressive-cutover` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/133-core-spine-aggressive-cutover/spec.md`

## Summary

本计划把 `@logixjs/core` 的 authoring / assembly / verification 主脊柱压成更小且单一的一组规则：

- `Module` 只承接定义期语义
- `Logic` 只承接具名行为单元
- `Program` 承接装配、复用与组合
- `Runtime` 承接运行与 control plane

计划同时要求把这套公式回写到 docs、examples、README 与领域映射说明中，尤其补齐“业务概念如何映射到主链”的 SSoT，以及一份 CRUD 管理页示例。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Effect v4
**Primary Dependencies**: `packages/logix-core/src/{Module.ts,Logic.ts,Program.ts,Runtime.ts,index.ts}`, `packages/logix-react/**`, `examples/logix/**`, `docs/ssot/runtime/**`, `docs/adr/**`, `docs/standards/**`
**Storage**: files / N/A
**Testing**: Vitest, `tsc --noEmit`, repo-wide grep gates, `pnpm check:effect-v4-matrix`, `pnpm typecheck`, `pnpm lint`, `pnpm test:turbo`
**Target Platform**: Node.js 20+ + modern browsers
**Project Type**: pnpm workspace monorepo
**Performance Goals**: 公开主脊柱收口不引入未解释行为或性能回退；若命中 runtime core 行为路径，提供 before/after comparable evidence
**Constraints**: forward-only；不保留兼容层；允许推翻当前 docs 细节；必须补齐业务概念映射与 CRUD 示例；`Program.capabilities.imports` 公开面只接受 `Program`
**Scale/Scope**: `logix-core` 主脊柱、`logix-react` host projection、canonical examples、runtime SSoT 与 standards

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: PASS
  spec、plan、tasks 都记录 NS-4 / NS-8 / NS-10、KF-8 / KF-9。
- **Intent → Flow/Logix → Code → Runtime 链路**: PASS
  本轮正是在压缩 `Module / Logic / Program / Runtime` 这条链路。
- **Docs-first & SSoT**: PASS WITH WRITEBACK
  docs 可以被推翻，但必须在同一波实现里同步回写，不允许只改代码。
- **Effect / Logix contracts**: PASS WITH BREAKING GATE
  公开 authoring contract 会收口，breaking change 按 forward-only 处理。
- **Deterministic identity / transaction boundary**: PASS
  本轮不主动改实例、事务和诊断 identity 语义；若实现时误触，必须补验证。
- **React consistency**: PASS WITH PROJECTION CHECK
  `@logixjs/react` 必须对齐“全局读 Module，局部挂 Program”的心智。
- **Internal contracts & trial runs**: PASS
  verification 继续沿用 proof-kernel 方向；本轮只收口公开命名和 route 心智。
- **Dual kernels (core + core-ng)**: PASS
  不在本轮扩 kernel family。
- **Performance budget**: PASS WITH EVIDENCE
  若触及 runtime core 行为边界，再补 perf evidence。
- **Diagnosability & explainability**: PASS
  业务映射和主公式说明都属于 explainability 提升的一部分。
- **Breaking changes (forward-only evolution)**: PASS
  不保留 `.implement` 和其他兼容壳层。
- **Public submodules**: PASS WITH ROOT BARREL GATE
  `index.ts` 必须建立显式 allowlist。
- **Large modules/files (decomposition)**: PASS WITH ACTION
  `Module.ts`、`index.ts`、可能触达的 runtime shell 文件如果继续膨胀，优先下沉到 `src/internal/authoring/**` 或其它互斥子模块。
- **Quality gates**: PASS
  最终执行必须跑 `pnpm check:effect-v4-matrix`、`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后
- envId：当前本机统一开发环境
- profile：default
- collect（before / after）：只在命中 runtime core 行为路径时执行
- diff：只在存在 comparable artifacts 时执行
- Failure Policy：无 comparable evidence 时，禁止下性能改善结论，只允许下结构收口结论

## Project Structure

### Documentation (this feature)

```text
specs/133-core-spine-aggressive-cutover/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Module.ts
├── Logic.ts
├── Program.ts
├── Runtime.ts
├── index.ts
└── internal/
    ├── authoring/
    └── verification/

packages/logix-react/
├── src/
└── README.md

examples/logix/src/
├── runtime/
├── features/
└── scenarios/

docs/
├── adr/
├── ssot/runtime/
└── standards/
```

**Structure Decision**: 本轮优先重构公开主脊柱与其直接投影层；若 authoring shell 继续膨胀，就把新归一化逻辑下沉到 `packages/logix-core/src/internal/authoring/**`，避免继续把定义期、装配期和 legacy 桥接混在同一文件里。

## Complexity Tracking

当前无已批准违例。
若 root barrel 清理超出本轮可控范围，允许保留显式 allowlist，并另起 follow-up spec 处理 subpath import 大迁移。

## Phase 0: Research

产物：[`research.md`](./research.md)

目标：

1. 固定最终更小公式
2. 固定 `Module` 与 `Program` 的边界
3. 固定业务概念映射和 CRUD 示例结构
4. 固定 root barrel allowlist 与 legacy 清零范围

## Phase 1: Design

产物：

- [`data-model.md`](./data-model.md)
- [`contracts/README.md`](./contracts/README.md)
- [`quickstart.md`](./quickstart.md)

设计动作：

1. 定义公开 contract 与禁止项
2. 定义业务概念映射
3. 定义 CRUD 管理页 program tree 示例
4. 定义验证、grep gate 与 allowlist gate

## Phase 2: Implementation Planning

本 spec 的 `tasks.md` 不使用 speckit 默认 checklist 模板。
它直接采用详细 implementation plan 结构，作为实际执行入口，原因是：

- 本轮跨越 docs、core、react、examples、root barrel，多层协同更适合 chunk 化计划
- 需要精确记录文件落点、验证命令和 gate
- 默认 checklist 粒度不足以承载本轮 cutover 复杂度

`tasks.md` 将覆盖：

1. docs 与 dts 合同先行
2. `Logic surface` 收口
3. `Program imports` 纯化与 legacy assembly 删除
4. verification naming 收口
5. root barrel allowlist 与最终 sweep
