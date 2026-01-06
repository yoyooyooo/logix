# Implementation Plan: Logix Runes（Svelte-like 赋值驱动状态语法糖）

**Branch**: `072-logix-runes-dx` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/072-logix-runes-dx/spec.md`

> 本 plan 作为“可复查的设计备忘录 + 风险登记簿”，允许暂不进入实现；未来每次 Logix DX/运行时演进时可回来看是否仍成立。

## Summary

交付目标（对应 `spec.md` In Scope + FR/NFR/SC）：

- 让开发者在 React 组件内可写：`let count = $state(0); count += 1`，且 UI 更新可靠（SC-001）。
- 赋值语法糖仍走 Logix 的可追踪写入通道（不引入可写 Ref 逃逸口），Devtools 不断链（FR-005/007）。
- 未启用 transform 或使用不支持语法时：fail-fast + 可操作的诊断（SC-002 / FR-004）。

关键策略：**编译期改写（Vite 插件）+ 最小运行时（@logix/react）**。

## Technical Context

**Language/Version**: TypeScript 5.8.2（workspace）  
**Primary Dependencies**: Vite（项目侧）+ React 19 + effect v3（3.19.13）+ `@logix/core` / `@logix/react`  
**Storage**: N/A  
**Testing**: Vitest（node/happy-dom）+（可选）浏览器集成测试在后续阶段再引入  
**Target Platform**: 现代浏览器（Vite dev/build）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- transform 未启用：零运行时成本（仅是普通 JS/TS）。
- transform 启用：渲染侧读路径成本接近 `useSelector`；写路径成本接近一次普通 `dispatch`（诊断 off）。

**Constraints**（本特性最容易踩坑的硬约束）：

- 赋值语法必须编译期改写：运行时无法拦截局部变量赋值。
- 必须遵守 React Hooks 规则：任何注入的 hook 调用必须在组件/自定义 hook 的顶层、顺序稳定。
- `+=/++/--` 必须是“基于最新提交值”的更新（避免闭包旧值导致丢更新）。
- 不允许深层属性写入/解构写入等高风险语法在 MVP 中“看似可用但断链”。
- Devtools/诊断事件必须 Slim 且可序列化，diagnostics off 时开销接近零（宪章 I）。

**Scale/Scope**: 面向“局部状态”高频交互；不作为全局状态方案。

## MVP 语义边界（先收敛再扩展）

> 目标：先把“可预测 + 可诊断 + 不断链”的最小子集跑通，避免把 DX 变成“偶尔灵验的魔法”。

### 1) 显式 opt-in（避免误伤）

- 仅对满足显式标记的文件做 transform（例如文件级指令或注释标记），避免任何包含 `$state` 的普通函数被注入 hook 导致“Invalid hook call”。

### 2) 声明位置约束（Hooks 规则）

- `$state(initial)` 仅允许出现在组件/自定义 hook 的函数体**顶层**（不在 if/for/try/catch/内层函数中）。
- 违反时：构建期报错并提示替代写法（例如改用 `useSelector/useDispatch` 或把状态提升到模块）。

### 3) 写入语义约束（避免闭包丢更新）

- `x += n` / `x++/--` 一律改写为“op-based 更新”（例如 `inc(key, delta)`），由运行时在提交点基于最新值计算。
- `x = expr` 首版只支持“右值不读取任何 rune”的表达式（或更严格：字面量/简单计算）；否则构建期报错，提示改写为 `x += ...` 或拆分到可追踪更新 API。

### 4) 表达式返回值语义约束（避免 JS 细节坑）

- `x++/--`、`++x/--x` 首版仅允许作为独立语句出现；不支持嵌入更复杂表达式（例如 `foo(x++)`），否则报错。

### 5) 深层写入（明确拒绝）

- 不支持 `obj.a = 1`、`arr.push()`、`x.y++` 这类深层可变写入；必须报错并提示“显式 set 整体值 / 使用模块状态 / 使用表单能力包”等替代方案。

## Design Overview（未来实施路线）

### 1) 包与职责划分（SRP）

- `@logix/runes`：只负责 **Vite transform**（编译期改写 + 报错诊断 + source map）。
- `@logix/react`：只负责 **Runes Runtime（hook + 最小状态容器）**，并提供 `$state` 作为编译期 marker（未启用 transform 时 fail-fast）。

### 2) Transform 产物的基本形态

- 对每个 rune-root 函数注入一次 `useRunes(...)`（或等价 hook），并将每个 `let x = $state(initial)` 改写为 `let x = runes.state.x`。
- 将支持的写入语法改写为对运行时 API 的调用（`set/inc/dec` 等），保证写入可追踪、可诊断、顺序稳定。

### 3) Devtools / 可诊断性

- Rune 写入在时间线上可观察：最小要求是它最终映射为一次可观测的 state commit（带 instanceId/txnSeq 锚点）。
- 需要防噪：高频点击不应让时间线不可用；计划在 Devtools 侧提供“runes 更新折叠/过滤”策略（实现阶段再落地）。

## Risks & Mitigations（坑位登记）

> 这部分是未来反复审视时的检查清单：每次扩展语义前先过一遍。

1. **编译链路耦合 + source map**：不做 source map 会显著降低 DX（调试/报错定位）。  
   Mitigation：transform 必须产出稳定的 source map；错误消息必须指向原始源码位置。
2. **Invalid hook call**（最常见灾难）：任何误把普通函数当组件注入 hook 都会直接炸。  
   Mitigation：强制显式 opt-in；对 `$state` 的可用位置做静态校验并构建期报错。
3. **闭包旧值导致丢更新**：`count += 1` 不能改写成 `set(count + 1)`。  
   Mitigation：`+=/++/--` 使用 op-based 更新；必要时引入 `update(key, f)` 但要限制 `f` 的可序列化性。
4. **`++/--` 返回值语义**：JS 语义很细，容易“看似对但其实错”。  
   Mitigation：MVP 禁止在表达式中使用自增/自减；只支持独立语句。
5. **shadowing/作用域**：同名变量遮蔽会导致错误改写。  
   Mitigation：transform 必须做作用域追踪；MVP 只在受限形态下启用（其余报错）。
6. **深层属性写入**：很容易产生“写了但不触发/不进 trace”的隐蔽 bug。  
   Mitigation：明确拒绝并提示替代写法；后续若要支持，必须先定义可诊断的语义模型。
7. **Devtools 噪声与性能**：每次赋值都产生事件会刷爆时间线。  
   Mitigation：诊断协议与 UI 必须有折叠/聚合；diagnostics off 时必须接近零成本。
8. **字段级 evidence 退化（dirtyAll）**：若状态 schema 无法提供稳定 fieldPathId，可能退化为 dirtyAll。  
   Mitigation：MVP 先接受“局部状态小而可接受”的退化；若要优化，考虑生成 Struct schema 或引入专用 evidence 映射。
9. **批处理语义**：一个 handler 内多次写入若各自提交，可能带来多次渲染与重算。  
   Mitigation：后续设计显式 `batch` 或同 tick 合并，但必须把语义写进 spec/plan 并可诊断。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Intent → Flow/Logix → Code → Runtime**：
  - Intent：提升“局部状态”的 DX（spec 072）。
  - Flow/Logix：业务仍通过 Logix 的可追踪写入路径更新状态；不引入旁路状态机。
  - Code：新增 `@logix/runes`（transform）与 `@logix/react` 的 runes runtime 入口。
  - Runtime：复用现有 ModuleRuntime/dispatch 语义与诊断通道，不引入第二套运行时。（PASS）
- **docs-first & SSoT**：本期先以 `specs/072-logix-runes-dx/*` 为事实源；若要把“赋值语法糖的语义边界/诊断协议”上升为长期规范，再回写到 `docs/specs/sdd-platform/ssot` 与 runtime references。（PASS）
- **Effect/Logix contracts**：新增的是可选 DX 能力；不改变 `@logix/core` 的既有对外契约。（PASS）
- **IR & anchors**：不修改统一最小 IR；新增的是编译期改写与可选的诊断事件。（PASS）
- **Deterministic identity**：不引入随机/time 默认 id；复用 runtime 的稳定 instance/txn 锚点。（PASS）
- **Transaction boundary**：写入仍经由 dispatch/transaction；不在事务窗口内执行 IO。（PASS）
- **Dual kernels（core + core-ng）**：消费者不引入 `@logix/core-ng`；若未来需要对 core-ng 做适配，另开 spec。（PASS）
- **Performance budget**：不触及 Logix 核心热路径实现；主要风险在“事件频率上升/Devtools 噪声”。计划通过 opt-in + 语义收敛 + 证据基线控制。（PASS）
- **Breaking changes（forward-only）**：预期为新增能力；无 breaking。若未来调整语义边界，用迁移说明替代兼容层。（PASS）
- **Public submodules**：新包遵守 `src/index.ts` barrel；不暴露 internal。（PASS）
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`。（PASS）

## Perf Evidence Plan（MUST）

> 本特性可能触及“渲染关键路径”（高频交互），即使不改 core hot path，也建议在进入实现时补齐可复现证据。

暂记为 **N/A（本轮不实施）**；未来进入实现时的最小证据闭环建议：

- Baseline 语义：A/B 对照（同一 demo：`useState` vs `runes`；diagnostics off vs on）
- envId：`darwin-arm64.browser-chromium.headless`（示例）
- 指标：点击 10k 次的总耗时、渲染提交次数、diagnostics on 的额外开销上限
- 落点：`specs/072-logix-runes-dx/perf/*`（按 perf-evidence 规范）

## Project Structure

### Documentation (this feature)

```text
specs/072-logix-runes-dx/
├── spec.md
├── plan.md
├── research.md           # Phase 0：裁决与备选对比（本轮建议落盘）
└── tasks.md              # Phase 2：未来要实施时再生成
```

### Source Code (future)

```text
packages/logix-runes/
├── src/
│   ├── index.ts          # public barrel
│   ├── Vite.ts           # Vite plugin entry
│   └── internal/
│       ├── transform.ts  # AST transform + diagnostics
│       └── errors.ts
└── test/
    └── transform.test.ts

packages/logix-react/
├── src/
│   ├── Runes.ts          # $state marker + useRunes runtime
│   └── internal/...
└── test/
    └── Runes/...
```

**Structure Decision**: transform 与 runtime 分包，避免 `@logix/react` 绑定 Vite/编译链路，保持 SRP。

## Complexity Tracking

N/A（本 plan 选择“语义收敛的 MVP 子集 + opt-in”，避免把复杂度扩散到 core hot path。）
