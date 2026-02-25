# Quickstart: PR94 triggerStreams dedupe 性能证据回填

1. 运行定向测试：

```bash
pnpm -C packages/logix-core exec vitest run test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts
```

2. 查看证据文件：

- `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/module-statechange-dedupe.perf-evidence.off.json`
- `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/summary.md`
- `.context/prs/refactor-logix-core-triggerstreams-dedupe-evidence-20260225.md`
