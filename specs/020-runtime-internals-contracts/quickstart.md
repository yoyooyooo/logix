# Quickstart: Runtime Internals Contracts（如何理解与验证）

**Feature**: `specs/020-runtime-internals-contracts/spec.md`  
**Created**: 2025-12-21

## ≤5 关键词（心智模型）

1. **Kernel**：单一装配点；负责把共享依赖与子系统绑定到同一实例作用域。
2. **Runtime Services**：最小可替换契约；每个子系统只暴露必须能力（调度/事务/dispatch/traits/诊断…）。
3. **Scope**：生命周期边界；所有资源随实例销毁自动释放，禁止跨实例泄漏。
4. **Overrides**：按模块实例覆写；strict 默认，不回退全局，且有明确优先级与来源证据。
5. **Evidence**：可解释证据；诊断开启时能回答“为何生效/来源是什么”，关闭时近零成本。

补充澄清：Kernel 负责“装配/解析/闭包捕获”（把 Runtime Services 绑定到实例作用域）；RuntimeInternals 只是 internal hooks 的访问入口 Runtime Service（用于替代 `runtime.__*`/`bound.__*`），不承担装配逻辑。

## 粗粒度成本模型（你在为哪些成本买单）

- **装配成本**：在实例构建期解析/组合 Layer（一次性），决定可替换性与可测试性。
- **热路径成本**：dispatch/事务提交频率与单次开销；服务化不得引入额外每次查找/扫描。
- **诊断成本**：启用时可预估、可裁剪；关闭时不得默认构造大对象或遍历全量结构。

## 验证方式（实现阶段的最小闭环）

- 回归：`pnpm test` + `pnpm -C packages/logix-core test -- StateTrait.ConvergeAuto`（代表性热链路）。
- 类型/规范：`pnpm typecheck` + `pnpm lint`。
- 性能基线：`pnpm perf collect:quick`（before/after 同口径对比；结果与解释落到本特性文档中）。
- 受控试运行：在 Node/浏览器环境各执行一次“试跑样例”，导出 EvidencePackage（含 runtime services 证据与可用的 IR 摘要），并用 contracts/schema 校验（spec 005 + 本特性 020）。

## 贡献者迁移（从旧模式到新模式）

- 旧模式：跨文件函数通过“长参数列表”或“读 runtime.__* 私有字段”传递共享依赖与策略。
- 新模式：子模块从 Kernel/Runtime Services（Effect Env）获得依赖；调用点只需要最小入参（通常只传 runtime 或零入参），覆写通过 Layer/Provider 作用域表达，并能输出 Evidence。
