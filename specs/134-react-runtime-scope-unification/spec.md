# Feature Specification: React Runtime Scope Unification

**Feature Branch**: `134-react-runtime-scope-unification`
**Created**: 2026-04-09
**Status**: Planned
**Input**: User description: "把 RuntimeProvider、实例化、useModule/useImportedModule/ModuleScope 等 React host projection 一起收口，明确用户视角与实现边界：Program 是装配蓝图，ModuleRuntime 是实例，ModuleTag 只解析当前 scope 下唯一绑定；同 scope 重复 ModuleTag 绑定要 fail-fast，并把 RuntimeProvider 定位压回 runtime scope provider。"

## Context

`133-core-spine-aggressive-cutover` 已把 core 主脊柱压到 `Module / Logic / Program / Runtime`，但 React host projection 还残留四类会持续制造歧义的边界问题：

- `RuntimeProvider` 既承担 runtime scope 入口，又夹带 host-only gating、preload、config snapshot、layer binding 等实现细节，用户很容易把它误认成第二装配层
- `useModule` 当前仍接受 `Module / ModuleTag / Program / internal ProgramRuntimeBlueprint / ModuleRuntime / ModuleRef` 多种入口，公开心智与 SSoT 写法没有完全对齐
- `useImportedModule` 仍像一个独立 hook family，但它真正想表达的只是 `parent.imports.get(tag)` 的 hook 化薄糖；如果不把这一点钉死，它会继续长成第二条 child resolution 语义
- 同一个 `Module` 可以生成多个不同 `Program`，但 React 本地实例缓存与 `ModuleTag` 解析语义还没有把 “Program 是蓝图、ModuleRuntime 是实例、ModuleTag 只解析 scope-local 唯一绑定” 这组规则钉成硬边界

这份 spec 的目标，是把 React host projection 收口成稳定、可推导、对 Agent 友好的单一公式，并同时覆盖代码实现和用户视角：

- `RuntimeProvider` 只负责 runtime scope provider 与 host projection
- `Program` 是装配蓝图
- `ModuleRuntime` 是真实实例
- `ModuleTag` 只解析当前 scope 下唯一绑定
- `useImportedModule(parent, tag)` 只是 `parent.imports.get(tag)` 的 hook 形态
- 任何会让同一 scope 下的 `ModuleTag` 失去单值语义的装配都必须 fail-fast

## Scope

### In Scope

- `packages/logix-react/**` 中与 `RuntimeProvider`、`useModule`、`useImportedModule`、`useModuleRuntime`、`ModuleScope` 直接相关的公开面与实现
- `packages/logix-core/**` 中与 `Program` 蓝图身份、imports 归一化、scope 内重复 `ModuleTag` 绑定检测直接相关的实现
- `docs/ssot/runtime/**`、`docs/standards/**`、`packages/logix-react/README.md` 与 `examples/logix-react/**` 中的 React host projection 口径
- React 相关合同测试、运行时合同测试与必要的 dts surface 测试

### Out of Scope

- 不新增新的 runtime control plane 能力
- 不改写 `Runtime.make(Program)` 的公开主链
- 不扩展新的 host adapter family
- 不在本轮设计 alias imports 或新的多实例选择 DSL

## Assumptions & Dependencies

- `133-core-spine-aggressive-cutover` 的主脊柱结论继续成立
- forward-only 继续成立，不保留兼容层与弃用期
- React host projection 继续停在 package-local，不进入 `@logixjs/core` 公开主链
- `RuntimeProvider` 继续允许 host-only policy、fallback、preload、layer overlay，但这些能力不能回流成装配语义
- 若 `useModule(Module)` 与新 canonical 心智冲突，本轮允许直接从公开 surface 收口

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agent 能稳定推导 React host projection 的单一公式 (Priority: P1)

作为一个会生成 Logix React 代码的 Agent，我需要一条稳定的 host projection 公式，这样我在写 `RuntimeProvider`、`useModule`、`useImportedModule` 和 `ModuleScope` 时，不会在 `Module`、`Program`、`ModuleTag` 和内部 runtime blueprint 之间来回猜。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: 只要入口和实例语义还模糊，Agent 生成出来的 React 代码就会反复长回多入口、多心智和错误组合。

**Independent Test**: reviewer 能在 5 分钟内用 5 句话解释 React host projection：`RuntimeProvider` 提供 scope，`useModule(ModuleTag)` 做 lookup，`useModule(Program)` 做 instantiate，`host.imports.get(ModuleTag)` 解析 parent scope child，`ModuleRuntime` 才是实例。

**Acceptance Scenarios**:

1. **Given** 一个全局共享模块场景， **When** 作者查阅文档和示例， **Then** 他会直接写 `useModule(ModuleTag)`，并把它理解为“读取当前 scope 中已绑定的共享实例”。
2. **Given** 一个页面局部实例场景， **When** 作者查阅文档和示例， **Then** 他会直接写 `useModule(Program, { key })`，并把它理解为“按装配蓝图创建或复用局部实例”。

---

### User Story 2 - 用户能看懂 Program、ModuleRuntime、ModuleTag 的边界 (Priority: P2)

作为使用 Logix React 的开发者，我需要知道哪个对象是蓝图、哪个对象是实例、哪个对象只是查找符号，这样我才能在同一个 `Module` 生成多个 `Program` 时，仍然清楚自己拿到的到底是什么。

**Traceability**: NS-4, NS-8, KF-9

**Why this priority**: 用户视角如果看不懂边界，示例再多也会继续把 `ModuleTag` 误用成“多 Program 选择器”。

**Independent Test**: 给定两个来自同一 `Module` 的不同 `Program`，作者能说明为什么 `ModuleTag` 不负责在它们之间做选择，且知道如何通过 `Program` 或 parent imports handle 取到明确实例。

**Acceptance Scenarios**:

1. **Given** 同一个 `Module` 生成了两个不同 `Program`， **When** 作者阅读 SSoT， **Then** 他能说明 `Program` 是蓝图，`ModuleRuntime` 是实例，`ModuleTag` 只是在 scope 里解析唯一绑定。
2. **Given** 某个 parent host 实例已经导入了 child program， **When** 作者调用 `host.imports.get(Child.tag)`， **Then** 他拿到的是 parent scope 下的 child 实例，而不是“所有同模块 program 中的任意一个”。

---

### User Story 3 - `useImportedModule` 只是 parent-scope resolution 的薄糖 (Priority: P3)

作为使用 Logix React 的开发者，我需要 `useImportedModule` 只是一个很薄的 helper，而不是另一条会自己长语义的 hook family，这样我不会在 `useImportedModule`、`host.imports.get(tag)`、`ModuleScope.useImported(tag)` 之间猜它们有没有细微差别。

**Traceability**: NS-8, NS-10, KF-8, KF-9

**Why this priority**: 同一件事如果长出三条“看似接近”的入口，Agent 和用户都会开始猜测特例，系统就会重新长出第二公理面。

**Independent Test**: reviewer 能在 5 分钟内说明 `useImportedModule(parent, tag)` 只是在 render 里调用 `parent.imports.get(tag)` 的 hook 化薄糖，不承担 root 查找、Program 选择、跨 scope 搜索和新生命周期语义。

**Acceptance Scenarios**:

1. **Given** 一个已经拿到 parent host 实例的组件， **When** 它改写为 `useImportedModule(parent, Child.tag)`， **Then** 它拿到的 child 实例与 `parent.imports.get(Child.tag)` 完全一致。
2. **Given** `useImportedModule(parent, tag)` 解析失败， **When** 开发者看错误信息， **Then** 它看到的是 parent-scope wiring 问题，而不是“另一个独立 hook family 的特殊异常”。

---

### User Story 4 - 系统会拒绝让 ModuleTag 失去单值语义的装配 (Priority: P4)

作为 reviewer，我需要系统在开发期就拒绝任何会让同一 scope 下 `ModuleTag` 变成多义选择的装配，这样我不用靠代码 review 才发现“同模块多 program 在一个 scope 里打架”。

**Traceability**: NS-10, KF-8, KF-9

**Why this priority**: 这类歧义一旦进入运行时，Agent 和用户都无法稳定推导，错误信息也会变得很难解释。

**Independent Test**: reviewer 能构造一个 “同一 parent scope 导入两个来自同一 `Module` 的 child program” 的场景，并看到系统明确 fail-fast，错误信息指出冲突的 `moduleId`、scope 和修复建议。

**Acceptance Scenarios**:

1. **Given** 一个 parent `Program` 直接 imports 两个来自同一 `Module` 的 child `Program`， **When** runtime 尝试建立 parent scope imports， **Then** 系统必须 fail-fast，并报告 `ModuleTag` 绑定冲突。
2. **Given** 两个不同 `Program` 来自同一 `Module` 且局部 key 相同， **When** React 组件分别执行 `useModule(Program, { key })`， **Then** 它们必须得到不同 blueprint 对应的实例，不允许因缓存键只看 `moduleId` 而串实例。

### Edge Cases

- 同一个 `Module` 生成多个不同 `Program`，并在同一个 React 子树里以相同 `key` 局部实例化
- parent `Program` 的 `capabilities.imports` 同时放入两个来自同一 `Module` 的 child `Program`
- `RuntimeProvider` 嵌套且 `layer` 不同，但局部实例 `key` 相同
- root scope 用 `useModule(ModuleTag)` 读取共享实例，同时局部组件又用 `useModule(Program)` 创建同模块局部实例
- `useImportedModule(parent, tag)` 与 `ModuleScope.useImported(tag)` 在同一 parent scope 下必须解析到同一个 child 实例

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10, KF-8) 系统 MUST 把 React host projection 的标准心智固定为：`RuntimeProvider` 提供 runtime scope，`useModule(ModuleTag)` 读取 scope-local 共享实例，`useModule(Program)` 创建或复用局部实例，`ModuleRuntime` 才是实例对象。
- **FR-002**: (NS-8, KF-9) 系统 MUST 在文档、README、examples 和测试里明确区分 `Program`、`ModuleRuntime`、`ModuleTag` 的角色：装配蓝图、真实实例、scope-local 绑定符号。
- **FR-003**: (NS-8, KF-8) `ModuleTag` MUST 只解析当前可见 scope 下唯一绑定的实例；它不得承担在多个不同 `Program` 实例之间做选择的语义。
- **FR-004**: (NS-10, KF-8) 当同一可见 scope 内出现会让同一个 `ModuleTag` 失去单值语义的重复绑定时，系统 MUST fail-fast，并提供可执行的 dev 报错。
- **FR-005**: (NS-8, KF-8) 同一个 `Module` 生成多个不同 `Program` 时，系统 MUST 为每个 `Program` 保留稳定的 blueprint identity，并把它用于 React 本地实例缓存与诊断。
- **FR-006**: (NS-8, KF-8) `useModule(Program, { key })` 在同一 `Module` 的不同 `Program` 之间 MUST NOT 因共享 `moduleId + key` 而错误复用实例。
- **FR-007**: (NS-4, KF-9) `RuntimeProvider` MUST 被重新定位为 runtime scope provider 和 host projection adapter；它不得承担 `Program` 选择、业务装配或第二 control plane 语义。
- **FR-008**: (NS-8, KF-9) `useImportedModule(parent, tag)`、`host.imports.get(tag)` 和 `ModuleScope.useImported(tag)` MUST 对齐到同一条 parent-scope child-resolution 语义。
- **FR-009**: (NS-8, KF-8, KF-9) `useImportedModule(parent, tag)` MUST 被定义为 `parent.imports.get(tag)` 的 hook 形态；它 MUST NOT 引入 root 查找、Program 选择、跨 scope 搜索、隐式 fallback 或独立生命周期语义。
- **FR-010**: (NS-8, KF-9) canonical 文档与示例 MUST 只教授 `ModuleTag` lookup 与 `Program` instantiate 这两条主路；`useImportedModule` 只能作为 parent-scope helper 被说明，`useModule(Module)` 与公开 `.impl` 不得继续作为推荐写法出现。
- **FR-011**: (NS-4, KF-9) 本轮 MUST 同步更新 SSoT、README、examples、运行时合同测试与错误文案，避免出现“文档说一套、hooks 接一套、错误提示再说一套”的并行真相源。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) 本轮若触及 React 实例缓存或 runtime imports resolution 热路径，系统 MUST 提供可比较的行为证据与必要的性能基线，不允许无证据声称“更快”。
- **NFR-002**: (NS-10, KF-8) diagnostics=off 时，不得因为 blueprint identity 或 scope uniqueness 检查引入显著 steady-state 额外成本。
- **NFR-003**: (NS-10) 与实例相关的诊断、错误和缓存键 MUST 继续使用稳定、可推导的标识，禁止随机或时间源。
- **NFR-004**: (NS-8, KF-9) 本轮不允许长出第二套 React runtime truth source 或第二套 host projection DSL。
- **NFR-005**: (NS-8, KF-9) 若 `RuntimeProvider.tsx`、`useModule.ts` 或 `Module.ts` 在本轮继续膨胀，计划 MUST 包含拆解到更小内部子模块的动作。
- **NFR-006**: (NS-8, KF-9) breaking change 继续遵守 forward-only：提供迁移说明，不保留兼容层与弃用期。

### Key Entities _(include if feature involves data)_

- **Runtime Scope**: 一棵 React 子树当前可见的 runtime 绑定与 host policy 边界。
- **Program Blueprint**: 由 `Program.make(Module, config)` 产生的装配蓝图，承接局部实例化与 imports 组合语义。
- **ModuleRuntime Instance**: 真实运行中的实例，携带 `moduleId`、`instanceId`、dispatch、state 与 imports scope。
- **ModuleTag Binding**: 当前 scope 下某个 `ModuleTag` 对应的唯一共享实例绑定。
- **Imported Binding Slot**: parent instance scope 内的 child `ModuleTag -> ModuleRuntime` 解析表。
- **Host Projection Policy**: `RuntimeProvider` 的 host-only policy，包括 fallback、preload、layer overlay 和 sync/suspend/defer gating。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-8, KF-9) 在 `docs/ssot/runtime/**`、`packages/logix-react/README.md` 与 `examples/logix-react/**` 范围内扫描后，canonical 说明只保留 `useModule(ModuleTag)` 与 `useModule(Program)` 两条主路，不再把 `useModule(Module)` 或 `.impl` 作为推荐写法。
- **SC-002**: (NS-10, KF-8) 新增合同测试证明：同一 `Module` 的不同 `Program` 在相同 `key` 下局部实例化时不会串实例。
- **SC-003**: (NS-10, KF-8) 新增合同测试证明：同一 parent scope 内若导入两个来自同一 `Module` 的 child `Program`，系统会 fail-fast，并报告可读错误。
- **SC-004**: (NS-8, KF-9) reviewer 能在 5 分钟内说明 `RuntimeProvider / Program / ModuleRuntime / ModuleTag` 的边界，不需要引用历史心智或内部实现细节。
- **SC-005**: (NS-10, KF-8) `useImportedModule(parent, tag)`、`host.imports.get(tag)` 与 `ModuleScope.useImported(tag)` 的合同测试覆盖同一条 parent-scope resolution 语义。
- **SC-006**: (NS-8, KF-9) canonical 文档、README 与示例把 `useImportedModule` 明确描述成 parent-scope helper，不再把它写成独立语义层。
- **SC-007**: (NS-8, KF-9) `pnpm -C packages/logix-react exec vitest run` 的定向合同测试、`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 全部通过，且没有未解释回归。

## Clarifications

### Session 2026-04-09

- Q: 同一个 `Module` 可以生成多个不同 `Program` 时，`useModule(ModuleTag)` 该属于哪个 `Program`？ → A: `ModuleTag` 不负责在多个 `Program` 之间做选择；它只解析当前 scope 下唯一绑定。
- Q: 是否值得新增 `useProgram`？ → A: 暂不新增。公开心智收口到一个 hook 上：`useModule(ModuleTag)` 做 lookup，`useModule(Program)` 做 instantiate。
- Q: 实例化对象到底是谁？ → A: `Program` 是装配蓝图，`ModuleRuntime` 是真实实例。
- Q: `RuntimeProvider` 后面怎么定位？ → A: 回到 runtime scope provider 与 host projection adapter，不承担业务装配或第二 control plane 语义。
