---
title: Logix CLI & Dev Server · 本地桥接 Runtime 与 Studio
status: superseded
version: 0.1.0
value: core
priority: later
related:
  - ../../../sdd-platform/workbench/02-full-duplex-architecture.md
  - ../platform-vision/10-platform-deep-dive.md
  - ../runtime-v3-core/README.md
---

# 1. 背景：为什么需要 `logix dev`

在 v3 架构下，Logix 的“黄金链路”已经确定：

> `Logix.Module` → `Module.logic(($)=>...)` → Fluent DSL (`$.onState` / `$.onAction` / `$.on`) → **IntentRule IR** → 平台视图（Universe / Galaxy / Studio）

要让这条链路在真实项目里 **跑通且可回放**，需要一个长期常驻的本地服务，把：

- 本地源码（TS/React + Logix Runtime）  
- 平台 Studio（Spec Studio / Galaxy / IntentRule Explorer）  
- 运行中的 Runtime（`Logix.Runtime.make(...)` + Debug 事件流）  

稳态连接起来。

本草稿聚焦设计这条本地桥梁的“物理形态”——**`logix` CLI + Dev Server / Language Server**，作为：

- 开发者的统一入口（`npx logix dev`）；  
- 平台 Studio 与本地仓库的通信桥梁；  
- Runtime DevTools 与 Studio 的中介（转发 Trace / Runtime Tree 等信息）。

---

# 2. CLI 命令族：logix 作为入口

结合 `platform-vision` 中的规划，CLI 命令族的初步形态：

- `logix new`  
  - 使用模板创建新项目或 Feature（不在本草稿展开）。
- `logix dev`  
  - 启动本地 **Dev Server**（承载 Parser/Codegen/FS 访问）；
  - 可选联动 Local Studio Web UI。
- `logix generate`  
  - 执行一次性的代码生成任务（例如根据 OpenAPI 生成 Service Tag / Module 模板）。

本草稿主要关注 `logix dev`：

> 一条命令：`npx logix dev`  
> - 在当前项目目录下启动一个长期运行的 Dev Server；  
> - 提供 **Code ↔ IR ↔ Runtime** 所需的 HTTP / WebSocket / LSP 接口；  
> - 供 Web Studio（本地或远程）连接使用。

---

# 3. Dev Server 的职责与边界

从“责任分工”角度，Dev Server 应该做三件事，不做两件事。

## 3.1 应该做的

1. **项目感知（Project Awareness）**
   - 识别当前项目根（`tsconfig.json` / `package.json` / `logix.config.*`）；
   - 扫描 `Logix.Module` / `ModuleImpl` / `Logix.Runtime.make` 等定义，构建 Universe 级别的模块索引；
   - 暴露“模块 / Runtime 清单”给 Studio。

2. **Code ↔ IR 双向桥接**
   - Code → IR：
     - 基于 `v3/platform/impl/README.md` 的解析约束，使用 TS Compiler / ts-morph 从 Fluent DSL 生成 `IntentRule` 集合；
     - 支持增量：文件变动 → 重建部分 IR → 推送给 Studio。
   - IR → Code：
     - 接收 Studio 的“IR 编辑意图”（例如修改 debounce 参数、切换 run→runLatest）；
     - 通过 AST patch 修改对应的 Fluent 链，保持 **Code is Truth** 与项目风格（oxfmt/ESLint）不变；
     - 支持 dry-run diff 与回滚。

3. **Runtime 事件中继**
   - 与运行中的 Logix Runtime 建立连接（例如 WebSocket / DebugSink + HTTP）；
   - 订阅 Debug 事件流（action:dispatch / state:update / effect:start/end 等），并转发给 Studio；
   - 在可能的情况下，将事件与 IntentRule/LogicGraph 节点关联（利用 moduleId / logicId / correlationId）。

## 3.2 不应该做的

1. **不重复实现 Runtime**
   - Dev Server 不运行 Logix Runtime 本身，不重新实现 Flow/Effect 行为；
   - 它只消费 Runtime 暴露的 Debug/Introspection 接口（参考 `runtime-core-evolution` / DevTools 草稿）。

2. **不持久化“第二份真相”**
   - 不把逻辑存成 JSON 再编译回代码；  
   - 不自己维护数据库中的“规则表”；  
   - 所有规则的单一事实源仍然是：`*.logic.ts/tsx` 源码 + `IntentRule` IR 视图（可随时从源码再生）。

---

# 4. 架构草图：Studio ↔ Dev Server ↔ Runtime

结合 v3 Roadmap 与“全双工数字孪生”草稿，`logix dev` 启动后的整体架构可以抽象成：

- **Studio（前端）**  
  - Spec Studio / Galaxy / IntentRule Explorer 等视图；
  - 通过 HTTP/WebSocket/LSP 与 Dev Server 通信。

- **Dev Server（本地常驻进程）**  
  - File Watcher：监听代码变更；
  - Parser / Builder：Code → IR（IntentRule / LogicGraph）；
  - Codegen / Patcher：IR 编辑 → AST patch → 写回文件；
  - Trace Hub：接收 Runtime 的 Debug 事件并广播给 Studio。

- **Runtime（浏览器或 Node 中运行的 Logix Runtime）**  
  - `Logix.Runtime.make(RootImpl, { layer })` 创建的应用级 Runtime；
  - 通过 DebugSink / DevTools Hook / WebSocket 把运行时事件推送给 Dev Server。

在命令层面，`logix dev` 需要至少暴露：

- 固定或可配置的 HTTP 端口（例如 `http://localhost:4173`）；
- 一个 WebSocket/LSP 端点，用于：
  - 订阅 IR/Universe/RuntimeTree 更新；
  - 发送“修改 IR / 触发 Codegen”的命令。

---

# 5. 与 Runtime 的耦合点

目前 Runtime 规范已经明确：

- `Logix.Runtime.make(root, { layer, onError })` 是应用/页面级 Runtime 的 Composition Root（`root` 可为 program module 或其 `.impl`）；
- React 场景下，由 `RuntimeProvider runtime={Logix.Runtime.make(...)}`
  管理 Scope 与生命周期；
- 自定义 Runtime / 远程 Store 可以通过 `ModuleRuntime.fromAdapter` 封装。

Dev Server 与 Runtime 的接口建议走“最小 Hook 原则”：

1. **Debug 事件流**
   - 参考 `runtime-core-evolution` 与 `runtime-logix-devtools-and-runtime-tree` 草稿，Runtime 应暴露：
     - `DebugSink` 或类似 Tag，接受结构化事件（action / state / effect / error）；
     - 可选的 RuntimeMeta / RuntimeTree 查询接口。
   - Dev Server 只负责订阅和转发，不改 Runtime 行为。

2. **Runtime 标识与映射**
   - 每个 Runtime 实例在创建时应生成可稳定识别的 `instanceId`；
   - Dev Server 按 `instanceId` 管理多个运行实例（例如不同页面、不同 Storybook 场景），并把事件映射回 Studio 中对应的 Universe/Galaxy 节点。

3. **可选：Runtime 控制命令（长远）**
   - 后续可以考虑向 Runtime 发命令（例如“重放某条 Trace”、“重置某个 Module 状态”），但这属于 DevTools 扩展能力，不是 v1 必须。

---

# 6. 与 Builder / Parser 的关系

在 v3 平台架构下，`@logixjs/builder` 与 Runtime 的分工已经约定：

- `@logixjs/core`：只负责 Runtime 行为，视 Fluent DSL 为普通 TS/Effect 代码，不内建 AST/Pattern 概念；
- `@logixjs/builder`：把 `@logixjs/core` 视作“目标语言”，负责静态分析（AST）和出码。

`logix dev` 可以被理解为：

> 在当前项目上运行的“Builder + 文件系统 + DevTools 中枢”

实现层面建议：

- Dev Server 内部直接复用 Builder 的解析/生成能力（或共享同一个包）；
- Dev Server 本身不要再重复实现一套 Parser/Codegen，只做：
  - 调用 Builder 的“解析当前项目 / 单个文件”的接口；
  - 管理 Watcher / 缓存 / AST patch 的事务性；
  - 提供 HTTP/LSP 封装。

---

# 7. 首版 `logix dev` 能力切片（建议）

为了避免一口吃成终局，建议将 `logix dev` 演进拆成若干小步，每一步都能独立产生价值：

1. **Phase 1：只读 Universe / IntentRule Explorer**
   - Dev Server：
     - 监听项目文件；
     - 解析 `Logix.Module` + `.logic(($)=>...)` + Fluent DSL；
     - 暴露只读的 Universe / IntentRule JSON；
   - Studio：
     - 展示模块拓扑与规则列表；
     - 支持 Jump-to-Code（点击节点打开 VSCode / file+line 链接）。

2. **Phase 2：可编辑的 Fluent 参数（Graph → Code 单向回写）**
   - 增加“Modify IntentRule”接口，只支持安全的局部修改，例如：
     - 改 `.debounce(500)` → `.debounce(1000)`；
     - 切换 `.run` ↔ `.runLatest`；
   - Dev Server 使用 AST patch 修改代码，并自动格式化；
   - Studio 提供简单的属性面板与回写操作。

3. **Phase 3：Runtime Trace 接入**
   - Runtime 侧实现 Debug 事件流 PoC；
   - Dev Server 接收并转发事件；
   - Studio 在 Galaxy 图上高亮被触发的链路，提供最基本的“线路发光”调试体验。

4. **Phase 4：高级 DevTools / 双向控制**
   - Runtime Tree / TagIndex 可视化；
   - Runtime 状态控制（重置模块、回放部分 Trace）；
   - 简单的 AI 辅助（基于 Trace + 代码上下文生成“调试建议”）。

---

# 8. 待决问题与后续工作

## 8.1 待决问题

- **协议选择**：  
  - LSP 扩展 vs 自定义 HTTP/WebSocket 协议；  
  - 如何在 IDE（VSCode）与 Studio 浏览器之间复用同一套“语言服务”。

- **安全与权限**：  
  - 本地 Dev Server 对远程 Studio 开放时的权限控制；  
  - 如何确保只能访问当前项目范围内的文件。

- **多项目 / Monorepo 支持**：  
  - `logix dev` 在 Monorepo 中如何确定“当前项目根”；  
  - 是否支持一次性管理多套 Runtime。

## 8.2 后续建议

1. 在 `platform/impl` 目录下补一篇更细的 `logix-cli-and-dev-server-impl.md`，记录具体协议、端口、配置项与安全策略；  
2. 在 `runtime-logix` 规范中明确 Debug 事件流与 RuntimeAdapter 的对外接口，为 Dev Server / DevTools 提供稳定挂接点；  
3. 在 `builder-studio-roadmap-alignment` 草稿中，用本文件作为“Builder & Studio 首期可交付能力”的蓝本，列出 2–3 个近期可实现的子目标。 
