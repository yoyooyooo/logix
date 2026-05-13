# Implementation Plan: React Runtime Scope Unification

**Branch**: `134-react-runtime-scope-unification` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/134-react-runtime-scope-unification/spec.md`

## Summary

本计划把 React host projection 收口成单一且稳定的公式：

- `RuntimeProvider` 只提供 runtime scope 与 host projection
- `Program` 是装配蓝图
- `ModuleRuntime` 是真实实例
- `ModuleTag` 只解析当前 scope 下唯一绑定
- `useImportedModule(parent, tag)` 只是 `parent.imports.get(tag)` 的 hook 形态
- `useModule(ModuleTag)` 做 lookup，`useModule(Program)` 做 instantiate

实现顺序先用合同测试把 “Program 蓝图身份、ModuleTag 单值语义、RuntimeProvider 定位” 钉死，再把 core/react internals 收口，最后同步 SSoT、README、examples 与错误文案。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Effect v4
**Primary Dependencies**: `packages/logix-core/src/{Module.ts,Program.ts,internal/authoring/programImports.ts,internal/runtime/core/ModuleRuntime.impl.ts}`, `packages/logix-react/src/{RuntimeProvider.ts,ModuleScope.ts,internal/provider/RuntimeProvider.tsx,internal/hooks/useModule.ts,internal/hooks/useModuleRuntime.ts,internal/hooks/useImportedModule.ts,internal/store/resolveImportedModuleRef.ts,internal/store/ModuleCache.ts}`, `docs/ssot/runtime/**`, `packages/logix-react/README.md`, `examples/logix-react/**`
**Storage**: files / N/A
**Testing**: Vitest, `tsc --noEmit`, repo-wide quality gates
**Target Platform**: Node.js 20+ 与现代浏览器
**Project Type**: pnpm workspace monorepo
**Performance Goals**: blueprint identity 与 scope uniqueness 不引入未解释 steady-state 回退；若命中热路径，补可比较证据
**Constraints**: forward-only；不保留兼容层；React host projection 不进入 core 公开主链；同 scope 下 `ModuleTag` 单值语义必须为硬约束
**Scale/Scope**: `logix-core` 的 Program/imports 身份语义、`logix-react` 的 provider/hooks/scope 语义、React 相关文档与示例

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: PASS
  spec、plan、tasks 都记录 NS-4 / NS-8 / NS-10、KF-8 / KF-9。
- **Intent → Flow/Logix → Code → Runtime 链路**: PASS
  本轮是在 React host projection 层把 `Program / ModuleRuntime / ModuleTag / RuntimeProvider` 的边界重新钉成单一公式。
- **Docs-first & SSoT**: PASS WITH WRITEBACK
  runtime SSoT、README 与 examples 必须一波回写。
- **Effect / Logix contracts**: PASS WITH BREAKING GATE
  `useModule` 公开面可能收口，breaking change 继续按 forward-only 处理。
- **Deterministic identity / transaction boundary**: PASS
  本轮要强化 blueprint identity 与实例 identity 的稳定性，不改事务边界。
- **React consistency**: PASS
  核心目标就是把 React host projection 收成不撕裂、单一 scope 语义。
- **Internal contracts & trial runs**: PASS
  不引入新的 control plane，只做 host projection 收口。
- **Dual kernels (core + core-ng)**: PASS
  不扩 kernel family。
- **Performance budget**: PASS WITH EVIDENCE
  若命中缓存键和 imports resolution 热路径，再补证据。
- **Diagnosability & explainability**: PASS
  错误文案、边界说明、docs 映射都属于 explainability 一部分。
- **Breaking changes (forward-only evolution)**: PASS
  允许直接收口 `useModule(Module)`、错误文案和 docs 心智。
- **Public submodules**: PASS
  主要影响 `@logixjs/react` root exports 与内部文件组织。
- **Large modules/files (decomposition)**: PASS WITH ACTION
  `RuntimeProvider.tsx`、`useModule.ts`、`Module.ts` 若继续膨胀，优先拆小。
- **Quality gates**: PASS
  最终执行必须跑 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`，并补 React 定向合同测试。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后
- envId：当前本机统一开发环境
- profile：default
- collect（before / after）：只在命中缓存键或 imports resolution 热路径时执行
- diff：只在存在 comparable artifacts 时执行
- Failure Policy：无 comparable evidence 时，只允许下边界收口结论，不允许下性能改善结论

## Project Structure

### Documentation (this feature)

```text
specs/134-react-runtime-scope-unification/
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
├── Program.ts
└── internal/
    ├── authoring/programImports.ts
    └── runtime/core/ModuleRuntime.impl.ts

packages/logix-react/src/
├── RuntimeProvider.ts
├── ModuleScope.ts
└── internal/
    ├── provider/RuntimeProvider.tsx
    ├── hooks/useModule.ts
    ├── hooks/useModuleRuntime.ts
    ├── hooks/useImportedModule.ts
    └── store/
        ├── ModuleCache.ts
        └── resolveImportedModuleRef.ts

packages/logix-react/test/
├── Hooks/
└── RuntimeProvider/

docs/ssot/runtime/
├── 01-public-api-spine.md
├── 03-canonical-authoring.md
├── 07-standardized-scenario-patterns.md
└── 10-react-host-projection-boundary.md
```

**Structure Decision**: 本轮优先保持对外入口稳定，把真实变化收进 core/react 内部实现与合同测试。若 `RuntimeProvider.tsx` 与 `useModule.ts` 的职责继续变厚，拆分到 `internal/provider/**` 与 `internal/hooks/**` 的更小互斥文件。

## Complexity Tracking

当前无已批准违例。
若 `useModule(Module)` 的直接移除超出本轮可控范围，允许保留短期内部 sugar，但 canonical docs、examples 和公开推荐路径必须先收口。

## Phase 0: Research

产物：[`research.md`](./research.md)

目标：

1. 固定 `RuntimeProvider` 的最终定位
2. 固定 `Program`、`ModuleRuntime`、`ModuleTag` 的角色划分
3. 固定 `useImportedModule` 只是 parent-scope resolution 的薄糖
4. 固定同 scope 下 `ModuleTag` 单值语义与 fail-fast 规则
5. 固定 React 本地实例缓存必须区分同 `Module` 的不同 `Program`

## Phase 1: Design

产物：

- [`data-model.md`](./data-model.md)
- [`contracts/README.md`](./contracts/README.md)
- [`quickstart.md`](./quickstart.md)

设计动作：

1. 定义 runtime scope、program blueprint、module runtime instance、module tag binding 这组核心实体
2. 定义 `useModule(ModuleTag)` / `useModule(Program)` / `useImportedModule(parent, tag)` 的公开合同
3. 定义 `useImportedModule` 与 `host.imports.get(tag)` / `ModuleScope.useImported(tag)` 的等价关系与禁止项
4. 定义 duplicate binding fail-fast 的错误语义
5. 定义 RuntimeProvider 的职责边界与 docs 写法

## Phase 2: Implementation Planning

本 spec 的 `tasks.md` 不使用 speckit 默认 checklist 模板。
它直接采用 `writing-plans` 风格的详细 implementation plan，作为默认执行入口，原因是：

- 本轮同时改 core identity、react scope、hooks、provider、docs 与 examples
- 需要把“用户视角”和“实现视角”同时钉住
- 需要精确记录新增测试、文件落点、验证命令和 fail-fast 门禁

`tasks.md` 将覆盖：

1. 合同测试先行，固定用户视角与运行时语义
2. `Program` blueprint identity 与 React 本地实例缓存收口
3. `useImportedModule` 降为薄糖层，并与 `host.imports.get(tag)` / `ModuleScope.useImported(tag)` 合同对齐
4. 同 scope 重复 `ModuleTag` 绑定 fail-fast
5. hooks 与 `ModuleScope` 统一到 parent-scope resolution
6. `RuntimeProvider` 定位收口与 docs/examples sweep
