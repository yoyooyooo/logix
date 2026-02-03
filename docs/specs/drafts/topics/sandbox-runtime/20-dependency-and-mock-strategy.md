---
title: Dependency Governance & Mock Strategy
status: merged
version: 2025-12-06
value: core
priority: next
moved_to: ../../../../ssot/runtime/logix-sandbox/20-dependency-and-mock-strategy.md
---

## 1. 目标

> ✅ 已收编到 runtime SSoT：`docs/ssot/runtime/logix-sandbox/20-dependency-and-mock-strategy.md`（后续修改以 SSoT 版本为准）。

在浏览器 Worker 中建立可控的依赖与 Mock 治理闭环：核心依赖预注入、工具库 CDN 重写、未知 IO 通过 Universal Spy 观测，UI 库通过 Semantic Mock 降维，确保「能跑通 Logix/Effect 逻辑」而非「能跑所有 npm 包」。

## 2. 分层策略（复用 L4 草案思路）

1) Kernel 层：`effect`、`@logixjs/core` 等核心包预打包 + Blob 注入，esbuild 插件重写 import。  
2) Utility 层：工具库 Allowlist，编译时重写到 `https://esm.sh/...`，利用浏览器缓存；禁止任意 npm 直通。  
3) IO/SDK 层：默认走 Universal Spy（未在 Allowlist 的 import 统统重写），记录调用并按 MockManifest 返回模拟结果。  
4) UI 库层：`antd`/`mui` 等重写到 Semantic UI Mock，发射 UI_INTENT 信号，主线程线框渲染。

## 3. Universal Spy（落地要点）

- 编译期重写未 Allowlist 的 import → `universal-spy`；  
- Proxy 递归拦截，记录路径/参数/时间，返回可配置的 Mock（成功/失败/延迟）；  
- DevTools 展示：Trace 上显示 “Mock IO” 节点；Host 可调 Mock 行为。  
- 关系：与 runtime-observability 的 Trace Schema 对齐；与 runtime-v3-core 的核心约束（事务窗口禁 IO / Slim 事件）共用。

## 4. Semantic UI Mock（落地要点）

- 编译期重写 UI 库 import → `semantic-ui-mock`；  
- Headless 实现：不渲染真实 DOM，发射组件状态与触发点的 UI_INTENT，保留子节点逻辑执行；  
- Host 渲染线框视图与触发控件（如 Button/Select），点击后通过协议回传执行回调；  
- 关系：与 ai-native-ui 主题的 Skeleton/AISlot 输入保持兼容，避免分裂；  
- 与 Playground/Alignment Lab 的关系：  
  - 在 Worker 内，Semantic UI Mock 将「UI 行为」降维为 **语义组件 + UI_INTENT 信号**，成为 UI 层的 Executable Spec；  
  - 在 Playground 中，这些 UI_INTENT 与 Spec/Scenario/IntentRule 对齐，用于验证「需求级交互意图是否被正确实现」（而不是验证像素级 UI）。

> 当前 PoC 状态（intent-flow 仓库）：  
> - 在 `@logixjs/sandbox` 中已经引入了最小版 HTTP Mock 实现：  
>   - 在 `types.ts` 中定义了 PoC 版 `MockManifest`：  
>     ```ts
>     interface HttpMockRule {
>       url: string
>       method?: string
>       status?: number
>       delayMs?: number
>       json?: unknown
>     }
> 
>     interface MockManifest {
>       http?: readonly HttpMockRule[]
>     }
>     ```  
>   - 协议层：`COMPILE` 命令已预留 `mockManifest?: MockManifest` 字段；  
>   - Worker 内：在 `sandbox.worker.ts` 中通过 `setupHttpProxy` 基于 `MockManifest.http` 覆盖 `fetch`，命中规则时直接返回 Mock Response（可配置状态码与延时），未命中则退回真实 `fetch`；  
>   - Host 侧：`SandboxClient.compile(code, filename?, mockManifest?)` 已支持通过参数携带 `MockManifest`。  
> - Universal Spy 与 Semantic UI Mock 仍处于设计阶段，尚未在代码中落地；上述 PoC 仅覆盖「HTTP Mock」这个子集，用于验证 Manifest 结构与 Worker 环境中 `fetch` 代理的可行性。

## 5. CORS / 类型获取 / 性能（风险与缓解）

- CORS：Mock First，真实请求需要 Proxy；在 MockManifest 中标明真实/模拟。  
- 类型：ATA Lazy + IndexedDB 缓存核心 d.ts；Kernel Types 预置；  
- 性能：esbuild-wasm 体积与加载策略、CDN 缓存、Allowlist 减少打包失败。

## 6. 近期行动（基础优先）

- [ ] Allowlist/Manifest 草稿：定义核心工具包清单与 MockManifest 结构（成功/失败/延时等）。  
- [ ] esbuild 插件实现：Kernel/Utility 重写、Spy/Mock 注入的最小版本。  
- [ ] UI Mock 最小样例：Modal/Button 信号 + 主线程线框交互跑通。  
- [ ] DevTools 展示：Mock/Spy 记录在 Trace 视图中可见，便于调试与治理。

## 7. 与后续阶段衔接

- Intent 覆盖：在 Spy/UI_INTENT 记录中携带 Intent/Step ID。  
- 多运行时漏斗：同一 MockManifest 应能在 Deno/Flow Runtime 侧复用或显式禁用。  
- AI Feedback：Mock/Spy 记录可转为 AI 诊断输入，提示依赖治理建议。
