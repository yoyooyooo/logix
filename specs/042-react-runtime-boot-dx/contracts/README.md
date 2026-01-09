# Contracts: React 冷启动/解析策略

**Feature**: `042-react-runtime-boot-dx`  
**Created**: 2025-12-27  

本特性不新增 HTTP/Schema 等对外协议文件；对外契约体现为 `@logixjs/react` 的 TypeScript API（RuntimeProvider props / hooks options / 可注入配置 Tag）。

实施阶段需要在以下位置完成“契约落点”与文档对齐：

- `packages/logix-react/src/RuntimeProvider.ts`
- `packages/logix-react/src/Hooks.ts`
- `packages/logix-react/src/internal/provider/config.ts`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`（Provider boot/gating/preload 的内部实现）
- `packages/logix-react/src/internal/store/ModuleCache.ts`（为 preload 增补非 Suspense 的加载路径）
- `.codex/skills/project-guide/references/runtime-logix/logix-react/*`（SSoT）

### 本轮新增/调整的对外契约（摘要）

- `RuntimeProvider`：
  - `policy.mode`: `"sync" | "suspend" | "defer"`（默认 `suspend`）
  - `policy.preload`: `ReadonlyArray<ModuleHandle>`（仅 `defer` 生效，用于路由/Layout 级预加载）
  - `fallback`: 作为 `suspend/defer` 与 layer 未就绪时的统一回退 UI（一个入口，不拆两套心智）
- `useModule` / `useModuleRuntime`：
  - 读取 Provider 下发的策略默认值（无需业务侧处处手写 `suspend:true`）
  - `defer` 不通过“返回半初始化句柄”交付；而是依赖 Provider gating/preload 保证 children mount 时句柄已就绪
