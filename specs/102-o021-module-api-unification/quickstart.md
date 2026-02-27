# Quickstart: O-021 Module 实例化 API 统一

## 1. 校验规格产物

1. 打开 `specs/102-o021-module-api-unification/spec.md` 确认 FR/NFR/SC。
2. 打开 `specs/102-o021-module-api-unification/contracts/migration.md` 确认迁移路径。

## 2. 实现顺序建议

1. 收敛 `Module.ts` 与 `ModuleFactory.ts` 的实例化共核。
2. 调整 `Runtime.ts` 对统一入口的接线。
3. 同步 examples/react/sandbox 的调用点。
4. 更新中文文档并移除旧术语推荐。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## 4. 性能证据

- 按 `plan.md` 的 Perf Evidence Plan 采集 before/after/diff。
