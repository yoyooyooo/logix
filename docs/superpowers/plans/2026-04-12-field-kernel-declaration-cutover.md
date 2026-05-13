# Field Kernel Declaration Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 fields 相关体系整体收回内部 declaration compiler 层，公开作者面只保留 `Module / Logic / Program / Runtime` 与领域 DSL，不再保留任何独立公开的 field / field family。

**Architecture:** 这次改造直接做终局 cutover。核心做法是把 field declaration grammar 收到 `Logic` builder 局部语法里，由 `Program.make(...)` 统一 merge / compile，由 `Runtime.make(...)` 只负责安装和执行。Form 和 Query 不再接受 raw field fragment，统一回到各自 DSL。旧 `FieldKernel` 命名连同公开导出、内部目录和 canonical tests 一起清掉。

**Tech Stack:** TypeScript, Effect V4, Vitest, Turbo, React, Logix runtime, Form DSL, Query DSL, Devtools

---

## References

- `docs/adr/2026-04-12-field-kernel-declaration-cutover.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/05-logic-composition-and-override.md`
- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/standards/logix-api-next-guardrails.md`
- `AGENTS.md`

## File Structure

- `packages/logix-core/src/index.ts`
  - root surface。删除 `FieldKernel` 与 `FieldLifecycle`。
- `packages/logix-core/package.json`
  - public submodule exports 边界。禁止新增 `./FieldKernel` 一类新公开 family。
- `packages/logix-core/src/Module.ts`
  - `Module.logic(...)` 的公开作者面，加入 `$.fields(...)` collector 和局部 grammar helper。
- `packages/logix-core/src/internal/authoring/logicSurface.ts`
  - 逻辑构建器归一化，只接受同步声明区和 run effect。
- `packages/logix-core/src/internal/runtime/core/module.ts`
  - `BoundApi` 类型边界。新增 `fields` collector，删除旧 field 术语。
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - 运行期绑定 API。实现 `$.fields(...)` 和局部 grammar helper 的声明采集。
- `packages/logix-core/src/Program.ts`
  - declaration merge / compile 的主边界。
- `packages/logix-core/src/ModuleTag.ts`
  - 删除 module-level raw field fragment 与 runtime startup finalize 注入。
- `packages/logix-core/src/internal/reflection-api.ts`
  - 直接从 compiled program 读取 field IR。
- `packages/logix-core/src/internal/runtime/core/ModuleFields.ts`
  - 改名并演化为 field declaration merge 核心。
- `packages/logix-core/src/internal/field-kernel/**`
  - 本轮整体迁到 `packages/logix-core/src/internal/field-kernel/**`。
- `packages/logix-core/src/FieldLifecycle.ts`
  - 公开文件删除，能力下沉到 internal。
- `packages/logix-form/src/index.ts`
  - Form package root。只保留 `make / from / commands / Rule / Error / Path / react`。
- `packages/logix-form/src/Form.ts`
  - Form 顶层公开 authoring 契约。
- `packages/logix-form/src/internal/dsl/from.ts`
  - `Form.from(schema).logic(...)` 的唯一 bundle shape。
- `packages/logix-form/src/internal/dsl/logic.ts`
  - 只保留 Form 领域 DSL 输入，不再接受 `derived / raw field`。
- `packages/logix-form/src/internal/dsl/rules.ts`
  - 扩成终局 Form DSL，承接校验、派生、source wiring、list identity。
- `packages/logix-form/src/internal/form/impl.ts`
  - Form 到内部 field compiler 的 lowering。
- `packages/logix-form/src/Field.ts`
  - 删除。
- `packages/logix-query/src/Query.ts`
  - 移除 `config.fields`，只保留 `queries`。
- `packages/logix-query/src/Fields.ts`
  - 删除公开入口并内联到 Query 内部 lowering，或直接删除文件。
- `packages/logix-devtools-react/src/**`
  - `FieldGraphView` 等 UI、状态模型、文案改成 `FieldGraph` 或更中性命名。
- `examples/logix/**` `examples/logix-react/**`
  - canonical examples 改成 `$.fields(...)` 和 Form / Query DSL。
- `packages/logix-core/test/**` `packages/logix-form/test/**` `packages/logix-query/test/**`
  - 收口 tests 命名和断言范围，删除公开 `FieldKernel` 路径假设。

## Implementation Rules

- 不保留面向外部的兼容层。
- 不新增公开 escape hatch。
- 如果中间提交里必须存在桥接代码，当前 chunk 结束前必须删掉。
- 公开 surface 的删改优先于内部重命名，内部重命名优先于 examples 清理，examples 清理优先于最终全量验证。
- 每个 chunk 完成后跑 focused tests，再跑对应 package typecheck。
- 所有命令都使用一次性命令，禁止 watch。

## Chunk 1: Core Public Surface Collapse

### Task 1: 删除公开 `FieldKernel` / `FieldLifecycle`，禁止新建公开 `FieldKernel` family

**Files:**
- Modify: `packages/logix-core/src/index.ts`
- Modify: `packages/logix-core/package.json`
- Delete: `packages/logix-core/src/FieldKernel.ts`
- Delete: `packages/logix-core/src/FieldLifecycle.ts`
- Test: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Test: `scripts/public-submodules/verify.ts`

- [ ] **Step 1: 写失败测试，固定 root surface 和 public submodule 边界**

```ts
import { describe, expect, it } from 'vitest'
import * as Logix from '../../src/index.js'

describe('core root exports boundary', () => {
  it('does not expose any standalone field family', () => {
    expect('FieldKernel' in Logix).toBe(false)
    expect('FieldLifecycle' in Logix).toBe(false)
    expect('FieldKernel' in Logix).toBe(false)
  })
})
```

- [ ] **Step 2: 跑 focused test 和 public submodule 校验，确认当前实现失败**

Run: `pnpm exec vitest run packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts --reporter=dot`

Expected: FAIL，root export 仍暴露 `FieldKernel` 或 `FieldLifecycle`。

Run: `pnpm verify:public-submodules`

Expected: FAIL，仍然存在旧 submodule，或校验脚本未覆盖这条新边界。

- [ ] **Step 3: 写最小实现，删除 root export 和公开 submodule**

```ts
// packages/logix-core/src/index.ts
// 删除 FieldKernel / FieldLifecycle root exports
```

```json
// packages/logix-core/package.json
// 删除 ./FieldKernel 和 ./FieldLifecycle exports
// 不新增 ./FieldKernel
```

- [ ] **Step 4: 跑 focused test 和 public submodule 校验**

Run: `pnpm exec vitest run packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts --reporter=dot`

Expected: PASS

Run: `pnpm verify:public-submodules`

Expected: PASS

- [ ] **Step 5: 跑 core typecheck**

Run: `pnpm -C packages/logix-core typecheck`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/logix-core/src/index.ts packages/logix-core/package.json packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts scripts/public-submodules/verify.ts
git rm packages/logix-core/src/FieldKernel.ts packages/logix-core/src/FieldLifecycle.ts
git commit -m "refactor(core): remove standalone field public surface"
```

### Task 2: 把 field declaration grammar 收到 `Logic` builder 局部语法

**Files:**
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/internal/authoring/logicSurface.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/module.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- Test: `packages/logix-core/test/Logic/LogicFields.AuthoringSurface.test.ts`
- Test: `packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`

- [ ] **Step 1: 写失败测试，固定 `$.fields(...)` 与局部 grammar helper**

```ts
it('declares field behavior only through the logic builder surface', async () => {
  const logic = M.logic('sum-logic', ($) => {
    $.fields({
      sum: $.computed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    return Effect.void
  })

  const program = Logix.Program.make(M, {
    initial: { value: 1, sum: 0 },
    logics: [logic],
  })

  const ir = CoreReflection.exportStaticIr(program as any)
  expect(ir.fields.some((f: any) => f.path === 'sum')).toBe(true)
})
```

- [ ] **Step 2: 跑 focused tests，确认当前实现还没有这条作者面**

Run: `pnpm exec vitest run packages/logix-core/test/Logic/LogicFields.AuthoringSurface.test.ts packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts --reporter=dot`

Expected: FAIL，`$.fields / $.computed` 未定义，或 IR 仍要等 runtime 才可读。

- [ ] **Step 3: 写最小实现，新增 `fields` collector 和 builder-local grammar**

```ts
// packages/logix-core/src/internal/runtime/core/module.ts
export type BoundApiFieldsApi<Sh extends AnyModuleShape, R = never> = {
  readonly declare: (spec: Record<string, unknown>) => void
}
```

```ts
// packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts
fields(spec) {
  if (getCurrentPhase() === 'run') throw ...
  runtimeInternals.declarations.registerFields(spec)
}

computed(input) {
  return makeComputedFieldSpec(input)
}
```

- [ ] **Step 4: 明确禁止公开 `{ setup, run }` 写法**

Run: `pnpm exec vitest run packages/logix-core/test/Logic/LogicFields.AuthoringSurface.test.ts packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts --reporter=dot`

Expected: PASS

- [ ] **Step 5: 跑 core logic suite**

Run: `pnpm exec vitest run packages/logix-core/test/Logic --reporter=dot`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/logix-core/src/Module.ts packages/logix-core/src/internal/authoring/logicSurface.ts packages/logix-core/src/internal/runtime/core/module.ts packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts packages/logix-core/test/Logic/LogicFields.AuthoringSurface.test.ts packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts
git commit -m "refactor(core): move field grammar onto logic builder"
```

### Task 3: 把 declaration merge / compile 前移到 `Program.make(...)`，删除 module-level raw field fragment

**Files:**
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-core/src/ModuleTag.ts`
- Modify: `packages/logix-core/src/internal/reflection-api.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleFields.ts`
- Test: `packages/logix-core/test/Logic/LogicFields.DeterministicMerge.test.ts`
- Test: `packages/logix-core/test/Logic/LogicFields.Setup.Declare.test.ts`
- Test: `packages/logix-core/test/Logic/LogicFields.ModuleLevel.ExpertWarning.test.ts`

- [ ] **Step 1: 写失败测试，固定“编译发生在 `Program.make(...)`，模块级 fields 彻底删除”**

```ts
it('builds field declarations during Program.make', () => {
  const program = Logix.Program.make(M, { initial, logics: [LA, LB] })
  const ir = CoreReflection.exportStaticIr(program as any)
  expect(ir.digest).toMatch(/field|mtraits/)
})
```

```ts
it('rejects Module.make({ fields }) immediately', () => {
  expect(() =>
    Logix.Module.make('Bad', {
      state: State,
      actions: { noop: Schema.Void },
      fields: {},
    } as any),
  ).toThrow(/Module\.make\(\{ fields \}\)/)
})
```

- [ ] **Step 2: 跑 focused tests，确认当前实现仍在 runtime startup 做 finalize**

Run: `pnpm exec vitest run packages/logix-core/test/Logic/LogicTraits.DeterministicMerge.test.ts packages/logix-core/test/Logic/LogicTraits.Setup.Declare.test.ts packages/logix-core/test/Logic/LogicTraits.ModuleLevel.ExpertWarning.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 写最小实现，把 merge / compile 前移到 `Program.make(...)`**

```ts
// packages/logix-core/src/Program.ts
const declarations = collectDeclarations(module, mountedLogics)
const compiledFields = compileFieldDeclarations(stateSchema, declarations.fields)
attachCompiledAssets(program, { fieldProgram: compiledFields })
```

- [ ] **Step 4: 删除 `ModuleTag` 里的 runtime startup finalize 注入和 `def.fields`**

Run: `pnpm exec vitest run packages/logix-core/test/Logic/LogicTraits.DeterministicMerge.test.ts packages/logix-core/test/Logic/LogicTraits.Setup.Declare.test.ts packages/logix-core/test/Logic/LogicTraits.ModuleLevel.ExpertWarning.test.ts --reporter=dot`

Expected: PASS

- [ ] **Step 5: 跑 core package tests 与 typecheck**

Run: `pnpm -C packages/logix-core typecheck && pnpm -C packages/logix-core test`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/logix-core/src/Program.ts packages/logix-core/src/ModuleTag.ts packages/logix-core/src/internal/reflection-api.ts packages/logix-core/src/internal/runtime/core/ModuleFields.ts packages/logix-core/test/Logic/LogicFields.DeterministicMerge.test.ts packages/logix-core/test/Logic/LogicFields.Setup.Declare.test.ts packages/logix-core/test/Logic/LogicFields.ModuleLevel.ExpertWarning.test.ts
git commit -m "refactor(core): compile field declarations during program assembly"
```

## Chunk 2: Internal Rename And Domain DSL Collapse

### Task 4: 内部 `state-field` 整批改名到 `field-kernel`

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/**`
- Create: `packages/logix-core/src/internal/field-kernel/**`
- Modify: all imports in `packages/logix-core/src/**`
- Test: `packages/logix-core/test/**`

- [ ] **Step 1: 写失败测试，固定内部命名不再暴露到 canonical outputs**

```ts
it('uses field terminology in reflection artifacts', () => {
  const ir = CoreReflection.exportStaticIr(program as any)
  expect(JSON.stringify(ir)).not.toContain('FieldKernel')
})
```

- [ ] **Step 2: 跑 focused tests，确认现有 artifacts 和错误文案仍带旧名**

Run: `pnpm exec vitest run packages/logix-core/test/FieldKernel/FieldKernel.StaticIr.test.ts packages/logix-core/test/CoreReflection.exportStaticIr.basic.test.ts --reporter=dot`

Expected: FAIL 或快照仍含旧名词。

- [ ] **Step 3: 迁移目录与类型命名**

```bash
mv packages/logix-core/src/internal/state-field packages/logix-core/src/internal/field-kernel
```

- [ ] **Step 4: 统一修正 imports、types、diagnostics 文案**

Run: `pnpm -C packages/logix-core typecheck`

Expected: PASS

- [ ] **Step 5: 跑 core focused tests**

Run: `pnpm exec vitest run packages/logix-core/test/CoreReflection.exportStaticIr.basic.test.ts packages/logix-core/test/FieldKernel/FieldKernel.StaticIr.test.ts --reporter=dot`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/logix-core/src/internal packages/logix-core/test
git commit -m "refactor(core): rename internal state-field modules to field-kernel"
```

### Task 5: 把 Form 收敛到单一领域 DSL，删除 raw field slot 与 `derived`

**Files:**
- Modify: `packages/logix-form/src/index.ts`
- Modify: `packages/logix-form/src/Form.ts`
- Modify: `packages/logix-form/src/internal/dsl/from.ts`
- Modify: `packages/logix-form/src/internal/dsl/logic.ts`
- Modify: `packages/logix-form/src/internal/dsl/rules.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Delete: `packages/logix-form/src/Field.ts`
- Test: `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
- Test: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
- Test: `packages/logix-form/test/Form/Form.Derived.Guardrails.test.ts`

- [ ] **Step 1: 写失败测试，固定 Form 只有领域 DSL**

```ts
import * as Form from '../../src/index.js'

it('keeps only domain-level root exports', () => {
  expect('fields' in Form).toBe(false)
  expect('rules' in Form).toBe(false)
  expect('node' in Form).toBe(false)
  expect('list' in Form).toBe(false)
  expect('Field' in Form).toBe(false)
})

it('accepts only Form DSL in Form.from(values).logic(...)', () => {
  const logic = Form.from(Values).logic({
    rules: Form.Rule.object({}),
  })
  expect(logic._tag).toBe('FormLogicSpec')
})
```

- [ ] **Step 2: 跑 focused tests，确认旧 `derived / fields / fields` 仍可进入**

Run: `pnpm exec vitest run packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts packages/logix-form/test/Form/Form.Derived.Guardrails.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 写最小实现，删除 root exports 和 raw authoring slot**

```ts
// packages/logix-form/src/internal/dsl/logic.ts
export type FormLogicInput<TValues extends object> = Readonly<{
  readonly rules?: RulesSpec<TValues>
}>
```

- [ ] **Step 4: 扩展 `rules` DSL，使其承接派生、source wiring、list identity**

Run: `pnpm exec vitest run packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts packages/logix-form/test/Form/Form.Derived.Guardrails.test.ts --reporter=dot`

Expected: PASS

- [ ] **Step 5: 跑 form package tests 与 typecheck**

Run: `pnpm -C packages/logix-form typecheck && pnpm -C packages/logix-form test`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/logix-form/src/index.ts packages/logix-form/src/Form.ts packages/logix-form/src/internal/dsl/from.ts packages/logix-form/src/internal/dsl/logic.ts packages/logix-form/src/internal/dsl/rules.ts packages/logix-form/src/internal/form/impl.ts packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts packages/logix-form/test/Form/Form.Derived.Guardrails.test.ts
git rm packages/logix-form/src/Field.ts
git commit -m "refactor(form): collapse authoring onto a single domain DSL"
```

### Task 6: 把 Query 收敛到 `queries` DSL，删除所有 field helper 逃生口

**Files:**
- Modify: `packages/logix-query/src/Query.ts`
- Delete: `packages/logix-query/src/Fields.ts`
- Modify: `packages/logix-query/src/index.ts`
- Test: `packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`
- Test: `packages/logix-query/test/Query/Query.ExpertTraitsWarning.test.ts`

- [ ] **Step 1: 写失败测试，固定 Query 只接受 `queries`**

```ts
it('rejects Query.make({ fields })', () => {
  expect(() =>
    Query.make('Q', {
      params: Params,
      initialParams: { q: 'x' },
      fields: {},
    } as any),
  ).toThrow(/Query\.make\(\{ fields \}\)/)
})
```

- [ ] **Step 2: 跑 focused tests，确认当前实现仍然留有 warning path**

Run: `pnpm exec vitest run packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts packages/logix-query/test/Query/Query.ExpertTraitsWarning.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 写最小实现，删除 `config.fields` 和公开 `Fields.ts`**

Run: `pnpm exec vitest run packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts packages/logix-query/test/Query/Query.ExpertTraitsWarning.test.ts --reporter=dot`

Expected: PASS

- [ ] **Step 4: 跑 query package tests 与 typecheck**

Run: `pnpm -C packages/logix-query typecheck && pnpm -C packages/logix-query test`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/logix-query/src/Query.ts packages/logix-query/src/index.ts packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts packages/logix-query/test/Query/Query.ExpertTraitsWarning.test.ts
git rm packages/logix-query/src/Fields.ts
git commit -m "refactor(query): remove raw field escape hatches"
```

## Chunk 3: Tooling, Examples, Final Cleanup

### Task 7: 统一 devtools、examples、tests 命名和文案，清掉 canonical `FieldKernel`

**Files:**
- Modify: `packages/logix-devtools-react/src/**`
- Modify: `examples/logix/**`
- Modify: `examples/logix-react/**`
- Modify: `packages/logix-core/test/**`
- Modify: `packages/logix-form/test/**`
- Modify: `packages/logix-query/test/**`

- [ ] **Step 1: 写失败测试，固定 devtools 和 canonical examples 不再出现 `FieldKernel`**

```ts
it('renders FieldGraph terminology in devtools', () => {
  render(<FieldGraphView program={program} />)
  expect(screen.queryByText(/FieldKernel/i)).toBeNull()
})
```

```ts
it('canonical examples do not import FieldKernel or FieldKernel', async () => {
  const source = await fs.promises.readFile(exampleFile, 'utf8')
  expect(source.includes('FieldKernel')).toBe(false)
  expect(source.includes('FieldKernel')).toBe(false)
})
```

- [ ] **Step 2: 跑 focused tests，确认旧命名仍然存在**

Run: `pnpm exec vitest run packages/logix-devtools-react/test/FieldGraphView/FieldGraphView.test.tsx packages/logix-core/test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 最小实现，统一改成 field / graph / declaration terminology**

Run: `rg -n "FieldKernel|FieldLifecycle|FieldKernel|\\.fields\\.declare|Query\\.make\\(\\{ fields|Form\\.fields|Form\\.rules|Form\\.node|Form\\.list|Form\\.Field|Form\\.derived" packages examples --glob '!**/dist/**'`

Expected: 只剩迁移期内部注释、历史测试目录名或明确允许的技术债清单；canonical examples 和公开 surface 不再出现。

- [ ] **Step 4: 跑全量验证**

Run: `pnpm check:effect-v4-matrix`

Expected: PASS

Run: `pnpm typecheck`

Expected: PASS

Run: `pnpm lint`

Expected: PASS

Run: `pnpm test:turbo`

Expected: PASS

- [ ] **Step 5: 提交最终 cleanup**

```bash
git add packages/logix-devtools-react packages/logix-core/test packages/logix-form/test packages/logix-query/test examples/logix examples/logix-react
git commit -m "refactor: finish field declaration compiler cutover"
```

## Final Verification Checklist

- [ ] `@logixjs/core` root export 不再包含 `FieldKernel` 与 `FieldLifecycle`
- [ ] 不存在新的公开 `FieldKernel` / field / field family
- [ ] `Logic` builder 提供唯一公开 field declaration collector `$.fields(...)`
- [ ] `Program.make(...)` 在装配期完成 declaration merge / compile
- [ ] `Runtime.make(...)` 不再承担 declaration merge / build
- [ ] `Module.make({ fields })` 已删除
- [ ] Form root surface 只保留领域 DSL
- [ ] Query root surface 只保留 `Query.make / Query.Engine / Query.TanStack`
- [ ] internal `state-field` 目录与 canonical names 已完成改名
- [ ] devtools/examples/tests 不再把 `FieldKernel` 当成公开概念
- [ ] `pnpm check:effect-v4-matrix`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:turbo`

Plan complete and saved to `docs/superpowers/plans/2026-04-12-field-kernel-declaration-cutover.md`. Ready to execute?
