# Quickstart: Docs Full Coverage Roadmap

## 1. 先看哪些文件

- `spec-registry.json`
- `spec-registry.md`
- `checklists/group.registry.md`

## 2. 先回答三个问题

1. 某个 docs 页面由哪个 spec 负责
2. 这个页面是 existing coverage 还是 second-wave spec
3. 后续应先推进哪个 member spec

## 3. 推荐只读检查

```bash
python3 - <<'PY'
from pathlib import Path
included = [
  'docs/README.md',
  'docs/adr/README.md',
  'docs/adr/2026-04-04-docs-archive-cutover.md',
  'docs/adr/2026-04-04-logix-api-next-charter.md',
  'docs/adr/2026-04-05-ai-native-runtime-first-charter.md',
  'docs/ssot/README.md',
  'docs/ssot/runtime/README.md',
  'docs/ssot/runtime/01-public-api-spine.md',
  'docs/ssot/runtime/02-hot-path-direction.md',
  'docs/ssot/runtime/03-canonical-authoring.md',
  'docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md',
  'docs/ssot/runtime/05-logic-composition-and-override.md',
  'docs/ssot/runtime/06-form-field-kernel-boundary.md',
  'docs/ssot/runtime/07-standardized-scenario-patterns.md',
  'docs/ssot/runtime/08-domain-packages.md',
  'docs/ssot/runtime/09-verification-control-plane.md',
  'docs/ssot/platform/README.md',
  'docs/ssot/platform/01-layered-map.md',
  'docs/ssot/platform/02-anchor-profile-and-instantiation.md',
  'docs/standards/README.md',
  'docs/standards/docs-governance.md',
  'docs/standards/effect-v4-baseline.md',
  'docs/standards/logix-api-next-guardrails.md',
  'docs/standards/logix-api-next-postponed-naming-items.md',
  'docs/next/README.md',
  'docs/next/2026-04-05-runtime-docs-followups.md',
  'docs/proposals/README.md',
]
text = Path('specs/120-docs-full-coverage-roadmap/spec-registry.md').read_text()
missing = [p for p in included if p not in text]
print('missing=', missing)
PY
```

## 4. 完成标准

- 27 个纳入页面全部有 owner
- `121-129` 全部存在
- group checklist 可以单点导航这组 spec
