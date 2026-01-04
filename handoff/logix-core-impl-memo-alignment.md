# Handoff：logix-core 实现备忘录对齐（impl 三方一致）

## 目标

- 将 `.codex/skills/project-guide/references/runtime-logix/logix-core/impl` 与当前实现代码、runtime-logix 的 SSoT 文档三方对齐，修正随迭代产生的命名/路径/示例漂移。

## 已完成

- impl 目录对齐（目录结构、ScopeLock、ConfigService、AppRuntime 生命周期、ModuleImpl 装配、EffectOp/Middleware/watchers 链路、StateTransaction/Devtools 命名与路径）。
- 修正 runtime-logix 文档中的错误 import 子路径（大小写敏感）：
  - `@logix/core/middleware` → `@logix/core/Middleware`
  - `@logix/core/effectop` → `@logix/core/EffectOp`

## 关键事实源（后续对齐优先看这里）

- AppRuntime 组装：`packages/logix-core/src/internal/runtime/AppRuntime.ts`
- ModuleImpl/withLayer/imports：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
- EffectOp middleware：`packages/logix-core/src/EffectOp.ts`、`packages/logix-core/src/Middleware.ts`
- StateTransaction/Debug/Devtools：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

## 待决/Next Action

- 若需要“服务 Tag 冲突检测”对业务可用（多模块 AppRuntime 装配场景），考虑把 `provideWithTags` 的能力以 public API 形式暴露（当前仅 internal helper，且 `@logix/core` exports 阻断 `./internal/*`）。
- 后续新增/维护文档时，避免使用 `@logix/core/<lowercase>` 子路径；优先使用 `import * as Logix from '@logix/core'` 或 exports 中的 PascalCase 子路径（例如 `@logix/core/Middleware`）。
