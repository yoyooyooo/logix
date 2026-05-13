1. 严重度：高  
位置：`Chunk 1 / Task 2`、`Chunk 3 / Task 7`，[2026-04-14-single-formula-public-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-14-single-formula-public-cutover.md:296)  
问题：Phase A 的测试面没有覆盖所有会被 `useModule(Module)` hard reject 直接打断的现有测试，计划会出现“focused tests 全绿，最终全仓门禁爆红”。  
原因：当前仓库里至少还有 [useProcesses.test.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/useProcesses.test.tsx:57)、[useImportedModule.test.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/useImportedModule.test.tsx:193)、[runtimeProviderTickServices.regression.test.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx:41) 继续把模块对象传给 `useModule`，它们不在 Task 2 的文件清单，也不在 Step 2/Step 5 的 focused tests 里。  
建议：在 Phase A 前加一条 `packages/logix-react/test/**` 级别的残留清单步骤，把所有 `useModule(Module)` 用法纳入同一批修正与 focused tests；至少补进上述三个测试文件。

2. 严重度：高  
位置：`Chunk 2 / Task 4`，[2026-04-14-single-formula-public-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-14-single-formula-public-cutover.md:596)  
问题：显式 docs sweep 清单与计划自己的 grep source of truth 已经不一致，当前无法稳定收口。  
原因：Task 4 明写“这些文件都在当前 grep 残留清单里”，但当前命中里包含 [i18n.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/guide/patterns/i18n.md:51) 和 [i18n.cn.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/guide/patterns/i18n.cn.md:51) 的 `$.root.resolve(...)`，两页都不在 Task 4 文件列表里，也不在 Step 3 的 allowlist 里。执行者若按显式清单改，Step 3 会直接失败；若顺手补改，又已经超出计划定义范围。  
建议：把 `guide/patterns/i18n.*` 显式纳入 Task 4，或重写计划让“实时 grep 输出”成为唯一 source of truth，并同步更新 allowlist。

3. 严重度：高  
位置：`Task 3 Step 1/3`、`Task 4 Step 1/3`、`Task 5 Step 1`、`Task 7 Step 1`，[2026-04-14-single-formula-public-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-14-single-formula-public-cutover.md:496)  
问题：grep 规则同时存在漏报和误报，关门条件不可信。  
原因：闭环 regex `useModule\\(.*impl\\)|useModule\\(Impl\\)` 漏掉了大量真实残留，例如 [module-scope.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/api/react/module-scope.md:73) 的 `useModule(HostImpl, options)`、[use-imported-module.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/api/react/use-imported-module.md:18) 的 `useModule(HostImpl, { key })`、[react-integration.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/guide/recipes/react-integration.md:461) 的 `useModule(WidgetImpl)`。同时，盘点 regex `useModule\\([A-Z][A-Za-z0-9_]*\\)` 又会把 canonical 的 `useModule(CounterProgram)` 也扫进去，例如 [GlobalRuntimeLayout.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/GlobalRuntimeLayout.tsx:90)，误导范围评估。  
建议：把“盘点”和“关门”拆成两套规则。盘点可宽松，关门必须显式覆盖 `\\.impl`、`\\b[A-Z][A-Za-z0-9_]*Impl\\b`、`useLocalModule`、`Root.resolve`，并结合明确 allowlist 文件集；更稳的做法是直接用 AST 或最少用多个窄 regex 分项校验。

4. 严重度：中  
位置：`Chunk 2` 全部 docs sweep 与 `Chunk 3 / Task 7 Step 2-3`，[2026-04-14-single-formula-public-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-14-single-formula-public-cutover.md:917)  
问题：文档改动量很大，但计划没有任何 docs app 的可执行验证，MDX/生成链路出错时不会被现有门禁捕获。  
原因：根脚本 [package.json](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/package.json:14) 只跑 `pnpm -r typecheck`，而 docs 包公开的是 [apps/docs/package.json](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/package.json:11) 的 `types:check`，不叫 `typecheck`。`pnpm test:turbo` 也不包含 docs 站点的构建检查 [package.json](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/package.json:39)。  
建议：在 Task 3/4 后补 `pnpm -C apps/docs types:check`，必要时再补 `pnpm -C apps/docs build`。否则这轮 docs sweep 只有文本 grep，没有站点级验证。

5. 严重度：中  
位置：`Task 1 Step 4` 与 `Task 2/3/4/5/6` 的多个 `Commit` 步骤，[2026-04-14-single-formula-public-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-14-single-formula-public-cutover.md:294)  
问题：计划对提交策略自相矛盾，也和仓库 AGENTS 约束冲突，执行时会卡在流程层。  
原因：Task 1 明写“按仓库策略跳过 commit”，但后续 Task 2、3、4、5、6 又都要求 `git add` 和 `git commit`。当前仓库规则明确要求未获用户显式授权时不能自动执行这些命令。  
建议：删掉所有强制 commit 步骤，改成“如用户明确要求再提交”的可选尾步骤；若确实需要分块提交，必须把授权前提写进计划文本。