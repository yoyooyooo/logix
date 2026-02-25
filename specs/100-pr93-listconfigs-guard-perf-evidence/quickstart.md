# Quickstart: PR93 listConfigs guard 性能证据回填

1. 运行性能证据测试：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts
```

2. 运行最小功能回归：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/RowId.UpdateGate.test.ts
```

3. 查看 PR 证据记录：

- `.context/prs/refactor-logix-core-moduletxn-listconfigs-guard-evidence-20260225.md`
