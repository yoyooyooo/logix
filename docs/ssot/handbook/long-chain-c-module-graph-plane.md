---
title: 长链路实现笔记 · C｜模块图谱（Module Graph Plane）
status: draft
version: 1
---

# 长链路实现笔记 · C｜模块图谱（Module Graph Plane）

> **主产物**：模块解析/实例绑定/跨模块协作的确定性语义（strict imports / root singletons / links）。
>
> **一句话**：不要让“模块解析”变成隐式全局服务定位，否则实例选择与诊断会彻底失真。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. 模块解析三分法（imports / root / link）
- 3. strict imports 与 `$.use`（为什么默认 strict）
- 4. Root.resolve（为什么固定读 rootContext）
- 5. Link（跨模块胶水逻辑的显式化）
- 6. React 侧实例解析（resolveImportedModuleRef）
- 7. 常见坑与排查
- 8. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - `packages/logix-core/src/Module.ts`、`packages/logix-core/src/Root.ts`、`packages/logix-core/src/Link.ts`
- **internal**
  - `$.use` / imports scope：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
  - root provider：`packages/logix-core/src/internal/runtime/core/RootContext.ts`
  - hierarchical injector：`packages/logix-core/src/internal/runtime/core/module.ts`（以及相关 internal）
  - React 解析：`packages/logix-react/src/internal/resolveImportedModuleRef.ts`
- **tests**
  - strict/imports：`packages/logix-core/test/BoundApi.MissingImport.test.ts`、`packages/logix-core/test/hierarchicalInjector.strict-isolation.test.ts`
  - root provider：`packages/logix-core/test/hierarchicalInjector.root-provider.test.ts`、`packages/logix-core/test/hierarchicalInjector.root-resolve.override.test.ts`
  - Link：`packages/logix-core/test/Link.test.ts`

## 2) 模块解析三分法（imports / root / link）

把三类解析当作互斥的语义通道（否则“看起来能用”，但可诊断性/可替换性会崩）：

- **imports（strict，树内协作）**
  - 语义：当前模块 impl 显式声明能用哪些子模块；解析只在这棵树内。
  - 目标：避免“全局乱 resolve”，保证可追踪、可 mock、可复现。
- **root（global，根单例）**
  - 语义：从当前 Runtime Tree 的 root provider 解析某个 Tag；不被更近 scope 覆盖。
  - 目标：表达“全局单例”意图（例如 platform 服务），并且让诊断能明确责任边界。
- **link（显式胶水）**
  - 语义：跨模块协作逻辑显式化为一个独立的 Effect（通常挂到 processes/links）。
  - 目标：把“协作关系”变成可见、可观测、可回放的 IR 资产，而不是隐藏在业务逻辑里。

## 3) strict imports 与 `$.use`（为什么默认 strict）

严格模式的价值不在“限制你”，而在于：

- 强迫你显式声明依赖树（否则无法解释“为什么这个模块能被解析到”）。
- 让 MissingImport 变成结构化错误（测试/devtools 都能消费）。
- 让实例绑定可推导（谁创建、谁持有、谁销毁）。

入口与守卫：

- `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`（`$.use` 的解析与 strict 检查）

## 4) Root.resolve（为什么固定读 rootContext）

Root 的核心语义是“避免局部 override 影响全局单例”：

- 固定从 RootContextTag 读取 rootContext（必要时 run-only 等待 ready）。
- 在 rootContext 未就绪时默认 fail-fast（避免 setup/layer 阶段误用造成死锁）。

入口：

- `packages/logix-core/src/Root.ts`

## 5) Link（跨模块胶水逻辑的显式化）

Link 是“跨模块协作”的第一等资产：

- 把参与模块列表变成稳定的 linkId（顺序无关）；
- 把协作逻辑包成冷 Effect，交给 Runtime 容器统一 fork；
- 后续 Devtools 可以把 link 当作拓扑节点展示/回放。

入口：

- `packages/logix-core/src/Link.ts`

## 6) React 侧实例解析（resolveImportedModuleRef）

React 层的难点是“组件树 vs runtime 树”的对齐：

- 在 StrictMode/Suspense 下，实例创建与释放会更频繁；
- resolveImportedModuleRef 需要保证“严格 imports 语义 + React 生命周期”同时成立。

入口：

- `packages/logix-react/src/internal/resolveImportedModuleRef.ts`

## 7) 常见坑与排查

- **在 setup 阶段 root.resolve 并等待 ready**：大概率是误用；优先改为 run 段解析。
- **把 imports 当 root 用**：会导致“依赖树变隐式”，最终表现为诊断难、mock 难、实例泄漏难定位。
- **Link 里偷偷做 state 写入**：Link 本质是执行面/协作面，写入仍必须遵守 A 数据面的事务窗口约束（不要在事务里 IO）。

## 8) auggie 查询模板

- “`$.use` 在 strict 模式下如何判定‘是否在 imports’？MissingImport 的错误结构在哪定义？”
- “RootContextTag 的 ready/未就绪语义是什么？`Root.resolve(...,{ waitForReady })` 的等待发生在哪？”
- “`Link.make` 如何生成稳定 linkId？Link 逻辑在 runtime 容器内怎么被 fork？”
- “React 的 `resolveImportedModuleRef` 如何在 StrictMode 下保证实例不漂移？实例 key 的裁决点在哪？”
