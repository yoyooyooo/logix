# StageGateRecord: G4

- gate: `G4`
- result: `NOT_PASS`
- mode: `strict_gate`
- timestamp: `2026-03-02T18:30:00+08:00`

## criteria

- `apps_examples_docs_v4_only`: `NOT_PASS`
- `schema_examples_no_legacy_syntax`: `NOT_PASS`
- `ssot_synced`: `NOT_PASS`

## commands

```bash
rg -n "effect v3|v3" apps/docs examples docs/ssot
rg -n "Schema\.partial\(|Schema\.Record\(\{\s*key:|Schema\.pattern\(|Schema\.Union\(|Schema\.Literal\(" apps/docs examples docs/ssot
```

## evidenceRefs

- `specs/103-effect-v4-forward-cutover/plan.md`
- `specs/103-effect-v4-forward-cutover/tasks.md`

## notes

- 阻塞原因：S5 文档与示例收口尚未完成。
