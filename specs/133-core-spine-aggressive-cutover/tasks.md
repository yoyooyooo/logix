# Core Spine Aggressive Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.
>
> **Speckit note:** This spec intentionally replaces the default checklist-style `tasks.md` with a detailed implementation plan. This file is the execution source of truth for `133-core-spine-aggressive-cutover`.

**Goal:** 把 `@logixjs/core` 的公开主公式压成更小且单一的一组规则：`Module.logic(id, build)`、`Program.make(Module, { initial, capabilities, logics })`、`capabilities.imports: [ChildProgram]`、`Runtime.trial(Program, options)`，并删除公开 legacy assembly 入口与其它 carry-over 入口，同时把业务概念映射和 CRUD 管理页示例写进 SSoT。

**Architecture:** 先重写 SSoT，把更小公式和业务映射定为目标，再用 dts 合同和运行时合同把新边界钉死。实现顺序按 `Logic surface -> Program imports -> legacy assembly removal -> verification naming -> business mapping / examples / docs cutover` 推进；`root barrel` 作为最后一个 gated chunk，只有在前面全部稳定后才做硬收口。若当前 docs 的细节比最终公式更大、更绕或更分叉，优先改 docs，不为迁就旧文档保留额外相位。

**Tech Stack:** TypeScript, Effect v4, Vitest, React 19, pnpm, Logix runtime internals

---

## Scope Check

这份计划覆盖的是一个耦合子系统：`authoring / assembly / verification / business-mapping` 公开主脊柱。

包含：

- `Module.logic` 的最终 authoring 公式
- `Program` 的 imports 装配纯度
- `Module` 与 `Program` 的边界治理
- legacy assembly method、`ModuleDef`、`AnyModule` 等遗留公开钩子删除
- `Runtime.trial` 公开命名收口
- examples、README、SSoT 与 standards 同步
- 业务概念映射与 CRUD 管理页示例
- root barrel 的最终硬收口 gate

不包含：

- 新 runtime 特性
- 新 control plane 能力
- `compare` 新协议扩张
- 热路径算法优化
- 非当前主脊柱相关的 `FieldKernel / Process / Workflow` 深层实现重写

执行前先读：

- `specs/133-core-spine-aggressive-cutover/spec.md`
- `specs/133-core-spine-aggressive-cutover/plan.md`
- `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/ssot/runtime/09-verification-control-plane.md`

## File Structure

### New Units

- Create: `packages/logix-core/src/internal/authoring/logicSurface.ts`
  - `Module.logic(id, build)` 的参数归一化、id 绑定、meta 写入、结构约束。
- Create: `packages/logix-core/src/internal/authoring/programImports.ts`
  - `capabilities.imports: [Program]` 到内部 `internal ProgramRuntimeBlueprint` 的归一化桥。
- Create: `packages/logix-core/test-dts/canonical-authoring.surface.ts`
  - 新 authoring 公开公式的 dts 合同夹具。
- Create: `packages/logix-core/test-dts/canonical-authoring.tsconfig.json`
  - 定向 dts 合同编译入口。
- Create: `packages/logix-core/test/Contracts/LogicSurface.id-required.test.ts`
  - `Module.logic(id, build)` 的运行时与契约测试。
- Create: `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
  - `capabilities.imports: [ChildProgram]` 的运行时装配测试。
- Create: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
  - root barrel 硬收口门禁。

### Existing Units To Modify

- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/Logic.ts`
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-core/src/Runtime.ts`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `packages/logix-core/src/internal/evidence-api.ts`
- Modify: `packages/logix-core/src/internal/reflection-api.ts`
- Modify: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- Modify: `packages/logix-react/README.md`
- Modify: `examples/logix/src/runtime/root.program.ts`
- Modify: `examples/logix/src/scenarios/expert-process-instance-scope.ts`
- Modify: `examples/logix/src/scenarios/expert-process-app-scope.ts`
- Modify: `examples/logix/src/scenarios/external-store-tick.ts`
- Modify: `examples/logix/src/scenarios/cross-module-link.ts`
- Modify: `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

## Chunk 1: Freeze The Smaller Formula

### Task 1: 先把 docs 改成最终目标公式与业务映射

**Files:**
- Modify: `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [x] **Step 1: 改写 canonical authoring 的目标公式**

目标文本必须收口到下面 4 条：

```ts
const SearchLogic = Search.logic('search-query', ($) => /* ModuleLogic */)

const AppProgram = Logix.Program.make(App, {
  initial: { ... },
  capabilities: {
    services: [ServiceLayer],
    imports: [ChildProgram],
  },
  logics: [SearchLogic],
})

const report = yield* Logix.Runtime.trial(AppProgram, options)
```

同时删除或改写这些旧口径：

- `rules / lifecycle / tasks` 作为唯一标准 logic 形态
- `ChildProgram.impl` 作为 canonical imports 示例
- 顶层 `imports` 仍保留 carry-over 的公开口径
- `Module.implement(...)` 仍可见于公开主链
- `TrialRun*` 作为公开控制面命名

- [x] **Step 2: 把业务概念映射写进 SSoT**

要求在 `docs/ssot/runtime/08-domain-packages.md` 和必要的 runtime 页里写清：

- `Module` 看业务边界
- `Logic` 看行为
- `Program` 看挂载与复用单元
- `Runtime` 看运行容器

并加入一个 CRUD 管理页示例，至少覆盖：

- `ListModule / ListProgram`
- `EditorModule / EditorProgram`
- `DetailModule / DetailProgram`
- `BulkActionModule / BulkActionProgram`
- `PageModule / PageProgram`
- `page-coordinate-selection-to-detail` 这类页级协调 logic

- [x] **Step 3: 用 grep 验证 docs 已切到更小公式**

Run:

```bash
rg -n "ChildProgram\\.impl|Module\\.implement|rules / lifecycle / tasks|顶层 `imports` 继续只保留 carry-over|TrialRun" \
  docs/adr/2026-04-05-ai-native-runtime-first-charter.md \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/08-domain-packages.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/standards/logix-api-next-guardrails.md
```

Expected:

- 只允许出现“历史残留已删除/已退出”的描述
- 不再出现把这些写法当成 canonical 的句子

- [x] **Step 4: 人工复核 docs 没有长出第二公式**

Run:

```bash
git diff -- \
  docs/adr/2026-04-05-ai-native-runtime-first-charter.md \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/08-domain-packages.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/standards/logix-api-next-guardrails.md
```

Expected:

- 所有例子都只剩一套写法
- `Logic` 的规范只强调 `id + build`
- `Program` 的 imports 只写 `Program`
- 业务映射与 CRUD 示例已经落盘

- [x] **Step 5: 按仓库策略跳过 commit**

### Task 2: 写 dts 合同，先把目标钉死

**Files:**
- Create: `packages/logix-core/test-dts/canonical-authoring.surface.ts`
- Create: `packages/logix-core/test-dts/canonical-authoring.tsconfig.json`

- [x] **Step 1: 写失败的 dts 夹具**

在 `packages/logix-core/test-dts/canonical-authoring.surface.ts` 写：

```ts
import { Effect, Schema } from 'effect'
import * as Logix from '../src/index.js'

const Child = Logix.Module.make('Child', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {},
})

const Parent = Logix.Module.make('Parent', {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {},
})

const ChildProgram = Logix.Program.make(Child, {
  initial: { value: 0 },
  logics: [],
})

const ParentLogic = Parent.logic('parent-ready', ($) => Effect.void)

Logix.Program.make(Parent, {
  initial: { ready: false },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [ParentLogic],
})

// @ts-expect-error id is required
Parent.logic(($) => Effect.void)

// @ts-expect-error top-level imports is removed from public config
Logix.Program.make(Parent, {
  initial: { ready: false },
  imports: [ChildProgram],
  logics: [ParentLogic],
})

// @ts-expect-error public Module.implement is removed
Parent.implement({ initial: { ready: false } })
```

- [x] **Step 2: 跑 dts 编译，确认当前先失败**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- 当前会失败
- 失败点至少包含 `Parent.logic('id', ...)`、`imports: [ChildProgram]`、`Parent.implement(...)` 之一

- [x] **Step 3: 固化 tsconfig 只覆盖这组合同**

`packages/logix-core/test-dts/canonical-authoring.tsconfig.json` 最小结构：

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["./canonical-authoring.surface.ts"]
}
```

- [x] **Step 4: 按仓库策略跳过 commit**

## Chunk 2: Logic Surface Cutover

### Task 3: 实现 `Module.logic(id, build)`，并把 id 写成唯一 canonical authoring 钩子

**Files:**
- Create: `packages/logix-core/src/internal/authoring/logicSurface.ts`
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/Logic.ts`
- Create: `packages/logix-core/test/Contracts/LogicSurface.id-required.test.ts`
- Test: `packages/logix-core/test/Runtime/Lifecycle/Lifecycle.test.ts`
- Test: `packages/logix-core/test/Platform.test.ts`

- [x] **Step 1: 写失败的运行时合同测试**

在 `packages/logix-core/test/Contracts/LogicSurface.id-required.test.ts` 写两个用例：

```ts
it('accepts Module.logic(id, build)', () => {
  const logic = Counter.logic('counter-bump', ($) => Effect.void)
  expect(logic).toBeDefined()
})

it('persists the provided logic id into mounted metadata', () => {
  const logic = Counter.logic('counter-bump', ($) => Effect.void)
  const program = Logix.Program.make(Counter, { initial: { count: 0 }, logics: [logic] })
  const descriptor = Logix.Module.descriptor(program)
  expect(JSON.stringify(descriptor)).toContain('counter-bump')
})
```

- [x] **Step 2: 跑定向测试，确认至少一条先失败**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/LogicSurface.id-required.test.ts \
  test/Runtime/Lifecycle/Lifecycle.test.ts \
  test/Platform.test.ts
```

Expected:

- 新合同测试失败
- 旧 runtime 测试仍可作为回归基线

- [x] **Step 3: 在 authoring helper 里实现 id 归一化**

在 `packages/logix-core/src/internal/authoring/logicSurface.ts` 放最小逻辑：

```ts
export const bindLogicSurface = <Sh extends AnyModuleShape, Ext extends object>(
  selfModule: ModuleBase<string, Sh, Ext>,
  id: string,
  build: (api: ModuleLogicApi<Sh, any, Ext>) => ModuleLogic<Sh, any, any>,
  options?: PublicLogicOptions,
): ModuleLogic<Sh, any, any> => {
  // 复用现有 tag.logic + attachLogicUnitMeta
}
```

关键要求：

- 公开签名里的 `id` 必填
- `options` 不再承接 `id`
- `moduleId` 继续由 `selfModule.id` 写入 meta

- [x] **Step 4: 修改 `Module.ts` 的公开签名**

目标形态：

```ts
readonly logic: <R = never, E = unknown>(
  id: string,
  build: (api: ModuleLogicApi<Sh, R, Ext>) => ModuleLogic<Sh, R, E>,
  options?: PublicLogicOptions,
) => ModuleLogic<Sh, R, E>
```

同时删掉旧的公开 `(build, options?)` 签名。若迁移期需要保留过渡桥，只允许留在 `Module.ts` 内部私有函数里，不能继续出现在公开 type 中。

- [x] **Step 5: 跑 dts 合同和运行时合同**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/LogicSurface.id-required.test.ts \
  test/Runtime/Lifecycle/Lifecycle.test.ts \
  test/Platform.test.ts
```

Expected:

- PASS

- [x] **Step 6: 按仓库策略跳过 commit**

### Task 4: 迁移 repo 内所有 `Module.logic(($) => ...)` 调用点，并清空旧签名

**Files:**
- Modify: 所有由以下命令列出的文件

```bash
rg -l "\\.logic(?:<[^>]+>)?\\(\\s*\\(" \
  examples/logix \
  packages/logix-core/test \
  packages/logix-react/test
```

- [x] **Step 1: 生成 callsite 清单**

Run:

```bash
rg -l "\\.logic(?:<[^>]+>)?\\(\\s*\\(" \
  examples/logix \
  packages/logix-core/test \
  packages/logix-react/test \
  > /tmp/logix-logic-callsites.txt
cat /tmp/logix-logic-callsites.txt
```

Expected:

- 输出所有仍使用旧签名的文件

- [x] **Step 2: 逐文件补 logic id**

迁移规则：

- id 用模块内局部 kebab-case
- id 表达 logic 职责，不复写 moduleId

示例：

```ts
Counter.logic('counter-bump', ($) => ...)
Search.logic<SearchApi>('search-query', ($) => ...)
LifecycleModule.logic('lifecycle-init', ($) => ...)
```

- [x] **Step 3: 再跑扫描，确保旧签名已清空**

Run:

```bash
rg -n "\\.logic(?:<[^>]+>)?\\(\\s*\\(" \
  examples/logix \
  packages/logix-core/test \
  packages/logix-react/test
```

Expected:

- 无输出

- [x] **Step 4: 跑定向回归**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Runtime/Lifecycle/Lifecycle.test.ts \
  test/Platform.test.ts \
  test/Runtime/Runtime.test.ts
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.test.tsx \
  test/RuntimeProvider/runtime-logix-chain.test.tsx
```

Expected:

- PASS

- [x] **Step 5: 按仓库策略跳过 commit**

## Chunk 3: Program Purity And Legacy Assembly Removal

### Task 5: 让 `capabilities.imports` 直接接受 `Program`，删除顶层 `imports`

**Files:**
- Create: `packages/logix-core/src/internal/authoring/programImports.ts`
- Modify: `packages/logix-core/src/Program.ts`
- Create: `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- Modify: `packages/logix-react/README.md`
- Modify: `examples/logix/src/runtime/root.program.ts`
- Modify: `examples/logix/src/scenarios/expert-process-instance-scope.ts`
- Modify: `examples/logix/src/scenarios/expert-process-app-scope.ts`
- Modify: `examples/logix/src/scenarios/external-store-tick.ts`
- Modify: `examples/logix/src/scenarios/cross-module-link.ts`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [x] **Step 1: 写失败的运行时合同测试**

在 `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts` 写：

```ts
const ChildProgram = Logix.Program.make(Child, { initial: { value: 1 }, logics: [] })
const ParentProgram = Logix.Program.make(Parent, {
  initial: { seen: 0 },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [ParentLogic],
})
```

测试目标：

- parent runtime 能解析 child runtime
- 无需手写 `.impl`

- [x] **Step 2: 跑合同测试与 dts 合同，确认当前先失败**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/ProgramImports.program-entry.test.ts
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- 至少有一处失败

- [x] **Step 3: 在 `Program.ts` 里改公开输入面**

目标形态：

```ts
export type ProgramImportEntry = ProgramType<any, any, any, any> | Layer.Layer<any, any, any>

export interface ProgramCapabilities {
  readonly services?: ProgramServiceLayer | ReadonlyArray<ProgramServiceLayer>
  readonly imports?: ReadonlyArray<ProgramImportEntry>
}

export interface Config<Sh extends AnyModuleShape, R = never> {
  readonly initial: StateOf<Sh>
  readonly capabilities?: ProgramCapabilities
  readonly logics?: Array<ModuleLogic<Sh, R, any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly workflows?: ReadonlyArray<Workflow>
  readonly stateTransaction?: ProgramStateTransactionOptions
}
```

并在 `internal/authoring/programImports.ts` 里通过 Program helper 归一化为内部 runtime blueprint。

- [x] **Step 4: 删除顶层 `imports` 和 `roots` 的公开残留**

要求：

- `Config` 不再暴露顶层 `imports`
- `normalizeConfig` 不再处理 `config.imports`
- 删除 `capabilities.roots` 的保留字分支

- [x] **Step 5: 迁移 examples 和 README**

统一替换为：

```ts
capabilities: {
  imports: [ChildProgram],
}
```

不再出现：

```ts
imports: [ChildProgram]
imports: [ChildProgram.impl]
```

- [x] **Step 6: 跑扫描和回归**

Run:

```bash
rg -n "imports:\\s*\\[[^\\]]*\\.impl|^\\s*imports:\\s*\\[" \
  examples/logix \
  packages/logix-react/README.md \
  docs/ssot/runtime \
  docs/standards

pnpm -C packages/logix-core exec vitest run \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/Runtime/Runtime.make.Program.test.ts

pnpm typecheck
```

Expected:

- grep 无旧 canonical 写法
- 定向测试 PASS
- `pnpm typecheck` PASS

- [x] **Step 7: 按仓库策略跳过 commit**

### Task 6: 删除公开 `.implement`、`AnyModule`、`ModuleDef`

**Files:**
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-react/test/internal/bestEffortCleanup.diagnostic.test.tsx`
- Modify: `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
- Modify: `packages/logix-react/test/internal/RuntimeExternalStore.lowPriority.test.ts`
- Modify: `packages/logix-react/test/internal/importedModuleContext.cleanup.test.tsx`
- Modify: `packages/logix-core/test-dts/canonical-authoring.surface.ts`

- [x] **Step 1: 在 dts 夹具里加入公开删除断言**

补充：

```ts
// @ts-expect-error deprecated type aliases are removed from public surface
type _Legacy = Logix.Module.ModuleDef<any, any>
```

- [x] **Step 2: 跑 dts 编译，确认当前先失败**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- 当前会因旧公开 surface 仍存在而失败

- [x] **Step 3: 修改 `Module.ts` 和 `index.ts`**

目标：

- `Module` 公开类型不再含 `implement`
- 删除 `AnyModule`
- 删除 `ModuleDef`
- root barrel 不再从 `Module` 导出这些 legacy type

允许保留的只有内部 `tag.implement(...)` 低层实现，不得经公开 surface 暴露。

- [x] **Step 4: 迁移 repo 内剩余 `.implement(...)` 调用**

先扫清单：

```bash
rg -n "\\.implement\\(" \
  packages/logix-core \
  packages/logix-react \
  examples/logix \
  docs \
  -g '!**/dist/**'
```

代码侧允许保留的唯一命中：

- `packages/logix-core/src/Module.ts` 内部 `tag.implement(...)`
- 历史计划文档和 archive 文档

把测试代码统一改成：

```ts
const program = Logix.Program.make(ModuleDef, {
  initial: ...,
  logics: [],
})
```

- [x] **Step 5: 跑回归**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Debug/Debug.OffSemantics.NoDrift.test.ts
pnpm -C packages/logix-react exec vitest run \
  test/internal/bestEffortCleanup.diagnostic.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/internal/RuntimeExternalStore.lowPriority.test.ts \
  test/internal/importedModuleContext.cleanup.test.tsx
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- PASS

- [x] **Step 6: 按仓库策略跳过 commit**

## Chunk 4: Verification Surface Naming And Business Mapping

### Task 7: 公开面只保留 `trial` 命名

**Files:**
- Modify: `packages/logix-core/src/Runtime.ts`
- Modify: `packages/logix-core/src/internal/evidence-api.ts`
- Modify: `packages/logix-core/src/internal/reflection-api.ts`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `packages/logix-core/test-dts/canonical-authoring.surface.ts`
- Modify: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

- [x] **Step 1: 在 dts 夹具里加入公开 trial 命名断言**

补充：

```ts
import type { TrialOptions, TrialReport } from '../src/Runtime.js'

declare const _trialOptions: TrialOptions
declare const _trialReport: TrialReport

// @ts-expect-error old public TrialRun names are removed
import type { TrialRunModuleOptions } from '../src/Runtime.js'
```

- [x] **Step 2: 跑 dts 编译，确认当前先失败**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- 当前会失败，因为 Runtime 还只导出 `TrialRun*`

- [x] **Step 3: 改公开类型名和注释**

目标：

```ts
export type { TrialOptions, TrialReport } from './internal/...'
export const trial = ...
```

要求：

- 公开面只出现 `trial`
- `Observability` 和 `Reflection` 注释不再泄露 `trialRun` 旧语义
- 若内部文件名暂时保留，可接受，但公开类型名、公开注释、docs 和 contract tests 必须全部切完

- [x] **Step 4: 跑定向验证**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/VerificationControlPlaneContract.test.ts \
  test/Runtime/Runtime.trial.runId.test.ts
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

Expected:

- PASS

- [x] **Step 5: 按仓库策略跳过 commit**

### Task 8: 把 CRUD 业务映射落实到 examples 和 docs 叙事

**Files:**
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `examples/logix/src/features/customer-search/customerSearch.def.ts`
- Modify: `examples/logix/src/features/customer-search/customerSearch.logic.ts`
- Modify: `examples/logix/src/features/customer-search/customerSearch.program.ts`
- Modify: `examples/logix/src/runtime/root.program.ts`

- [x] **Step 1: 复用现有 feature 作为易消化示例**

目标：

- 把 `customer-search` 系列文件按“定义 / 行为 / 装配 / root 组合”讲清
- 不一定重命名文件，但 docs 必须把它讲成一个 program-first business slice 示例

- [x] **Step 2: 在 docs 中加入 CRUD 管理页的 program tree 示例**

要求：

- 给出 `List / Editor / Detail / BulkAction / Page` 结构
- 明确哪些是 `Module`
- 明确哪些 `Logic` 属于 feature 内部，哪些属于页级协调
- 明确 root `PageProgram` 如何通过 `capabilities.imports` 组合子 `Program`

- [x] **Step 3: 跑 examples 相关扫描**

Run:

```bash
rg -n "ChildProgram\\.impl|imports:\\s*\\[|\\.implement\\(" \
  examples/logix/src/features/customer-search \
  examples/logix/src/runtime \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/08-domain-packages.md
```

Expected:

- 业务映射文档里不再出现旧 canonical 写法
- 示例代码与文档叙事一致

- [x] **Step 4: 按仓库策略跳过 commit**

## Chunk 5: Root Barrel Clamp And Final Sweep

### Task 9: 给 root barrel 建 allowlist，并在可控范围内做硬收口

**Files:**
- Create: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/src/index.ts`
- Modify: repo 内所有依赖 root expert exports 的调用点
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [x] **Step 1: 先写 allowlist 合同测试**

允许保留在 root barrel 的集合先收为：

```ts
[
  'Module',
  'Logic',
  'Program',
  'Runtime',
  'State',
  'Action',
  'Actions',
]
```

`CoreRootBarrel.allowlist.test.ts` 里动态导入 `src/index.ts`，断言 `Object.keys(Logix)` 不得超出 allowlist。

- [x] **Step 2: 跑合同测试，确认当前先失败**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:

- 失败，因为当前 root export 明显更宽

- [x] **Step 3: 生成 root expert import ledger**

Run:

```bash
rg -l "Logix\\.(Bound|Link|Handle|Flow|MatchBuilder|ReadQuery|ExternalStore|FieldKernel|FieldLifecycle|Resource|Kernel|ScopeRegistry|Root|Env|Debug|Middleware|Platform|ControlPlane|Observability|Reflection|InternalContracts|ModuleTag)" \
  packages \
  examples \
  > /tmp/logix-root-expert-imports.txt
cat /tmp/logix-root-expert-imports.txt
```

Gate:

- 若清单只落在当前仓测试、examples、README，可继续本 chunk
- 若清单超出当前计划可控范围，先停在 allowlist test + docs 收口，另起 follow-up 计划再做硬删除

- [x] **Step 4: 迁移可控调用点并裁剪 `index.ts`**

迁移规则：

- expert surface 统一改用子路径 import

示例：

```ts
import * as Link from 'legacy link surface'
import * as Reflection from '@logixjs/core/repo-internal/reflection-api'
import * as Debug from '@logixjs/core/repo-internal/debug-api'
```

然后删除 `index.ts` 中对应 root exports。

- [x] **Step 5: 跑 root barrel 与全量主验证**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts
pnpm check:effect-v4-matrix
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Expected:

- 全部 PASS

- [x] **Step 6: 再跑残留扫描**

Run:

```bash
rg -n "Module\\.implement|ChildProgram\\.impl|TrialRun|\\.logic(?:<[^>]+>)?\\(\\s*\\(" \
  packages/logix-core \
  packages/logix-react \
  examples/logix \
  docs/adr \
  docs/ssot \
  docs/standards \
  -g '!**/dist/**'
```

Expected:

- 只允许历史计划文档、archive 材料或内部实现细节出现
- 不允许在当前事实源、examples、README、公开 surface 中出现

- [x] **Step 7: 按仓库策略跳过 commit**

## Execution Notes

### 2026-04-26 ProgramRuntimeBlueprint follow-up

- Public `Program` no longer exposes any runtime blueprint property.
- Internal blueprint naming is `ProgramRuntimeBlueprint`; repo-internal helper access lives under `@logixjs/core/repo-internal/runtime-contracts`.
- `Program.make(...)` public config stays aligned with current SSoT and does not add `processes` or `workflows`.
- Migration-only verification files such as `moduleimpl-boundary.test.ts` are not retained.

- 若 `packages/logix-core/src/Module.ts` 在 implementation 过程中继续膨胀，优先用 `@module-decomposition` 把 authoring surface helper 下沉到 `src/internal/authoring/**`，不要继续把公开面、兼容桥和 assembler 混在一个大文件里。
- 若 `root barrel` 的 repo-wide import 迁移超出当前计划可控范围，允许在完成 Chunks 1-4 后停下，并新起一个只处理 subpath import 迁移的 follow-up spec。
- 验证必须遵守仓内门禁：至少跑 `pnpm check:effect-v4-matrix`、`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 后才能宣称本阶段完成。
