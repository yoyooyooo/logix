# Form Host Examples Dogfooding Cutover

日期：2026-04-17
规格：[/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/spec.md)
计划：[/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/plan.md)

## Chunk 1: Root Surface Cleanup

目标：把 `@logixjs/form` 根导出收口到 exact surface，先用边界测试锁住。

文件：

- 修改：[packages/logix-form/test/Form/Form.DomainBoundary.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.DomainBoundary.test.ts)
- 修改：[packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts)
- 修改：[packages/logix-form/src/index.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/index.ts)
- 修改：[packages/logix-form/package.json](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/package.json)

步骤：

1. 先把两条边界测试改成只承认 `make / Rule / Error / Path / SchemaPathMapping / SchemaErrorMapping`。
2. 跑 focused tests，确认因 `from / commands / FormView / ./react` 仍存在而失败。
3. 修改根 barrel 与 package export，移除旧 surface。
4. 再跑 focused tests，确认边界恢复为绿。

验证命令：

```bash
pnpm vitest run packages/logix-form/test/Form/Form.DomainBoundary.test.ts packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts
```

## Chunk 2: Canonical Docs Rewrite

目标：把用户会直接读到的 Form 文档统一改成 core host law + future exact surface 口径。

文件：

- 修改：[apps/docs/content/docs/form/index.mdx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/index.mdx)
- 修改：[apps/docs/content/docs/form/index.cn.mdx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/index.cn.mdx)
- 修改：[apps/docs/content/docs/form/introduction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/introduction.md)
- 修改：[apps/docs/content/docs/form/introduction.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/introduction.cn.md)
- 修改：[apps/docs/content/docs/form/quick-start.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/quick-start.md)
- 修改：[apps/docs/content/docs/form/quick-start.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/quick-start.cn.md)
- 修改：[apps/docs/content/docs/form/field-arrays.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/field-arrays.md)
- 修改：[apps/docs/content/docs/form/field-arrays.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/field-arrays.cn.md)
- 修改：[apps/docs/content/docs/form/performance.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/performance.md)
- 修改：[apps/docs/content/docs/form/performance.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/performance.cn.md)
- 修改：[apps/docs/content/docs/form/validation.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/validation.md)
- 修改：[apps/docs/content/docs/form/validation.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/validation.cn.md)
- 修改其他仍命中旧 surface 的 form 文档

步骤：

1. 统一把 React 消费叙事改到 `useModule / useSelector / useDispatch`。
2. 清掉 `Form.from(...)`、`useForm/useField/useFieldArray/useFormState`、`@logixjs/form/react`、`FormView` 的用户教学口径。
3. 若当前实现还未完全支撑 future exact authoring，文档明确以未来 canonical API 为准，避免继续传播 residue。
4. 全量搜索 form docs，确保旧 surface 不再残留。

验证命令：

```bash
rg -n "Form\\.from|useForm|useFieldArray|useField|useFormState|@logixjs/form/react|FormView|Form\\.commands" apps/docs/content/docs/form
```

## Chunk 3: Example And Dogfooding Alignment

目标：examples/dogfooding 退出 `@logixjs/form/react` 与旧叙事，统一到 core host law。

文件：

- 修改：[examples/logix-react/src/demos/form/**](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form)
- 修改：[examples/logix-react/src/modules/rules-composition-*.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules)

步骤：

1. 先迁移直接引用 `@logixjs/form/react` 的 demo。
2. 用 example-local helper 或直接 `useSelector/useDispatch` 承接字段读取和数组编辑。
3. 删除 example 中对 `Form.from(...)` 的说明性文案。
4. 若某个 demo 当前无法在本波次保持新口径，直接重写或删除，不保留双轨。

验证命令：

```bash
rg -n "@logixjs/form/react|useForm\\(|useFieldArray\\(|useField\\(|useFormState\\(" examples/logix-react
```

## Chunk 4: Registry And Repo Gates

目标：完成 146 收口，并回写总控状态。

文件：

- 修改：[specs/146-form-host-examples-dogfooding-cutover/tasks.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/tasks.md)
- 修改：[specs/140-form-cutover-roadmap/spec-registry.json](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/140-form-cutover-roadmap/spec-registry.json)
- 修改：[specs/140-form-cutover-roadmap/spec-registry.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/140-form-cutover-roadmap/spec-registry.md)

步骤：

1. 跑 focused tests 与 `pnpm typecheck`。
2. 跑 `git diff --check`。
3. 把 `146` 状态切到 `done`，并标记 tasks 完成。

验证命令：

```bash
pnpm typecheck
git diff --check
```
