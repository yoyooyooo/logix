# Logix Examples

This package contains standalone examples and scenarios for Logix v3.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

## Running Scenarios

You can run any scenario directly using `npx tsx`:

```bash
# Basic Fluent Intent Demo
npx tsx src/scenarios/fluent-intent-basic.ts

# Action -> State Update Demo
npx tsx src/scenarios/and-update-on-action.ts

# State -> State Update Demo
npx tsx src/scenarios/and-update-on-changes.ts

# Confirm Pattern Demo
npx tsx src/scenarios/confirm-simple-run.ts

# EffectOp Middleware · 基础用法
npx tsx src/scenarios/middleware-effectop-basic.ts

# EffectOp Middleware · Runtime 集成
npx tsx src/scenarios/middleware-runtime-effectop.ts

# EffectOp Middleware · Resource + Query 集成
npx tsx src/scenarios/middleware-resource-query.ts

# Feature-first · Minimal End-to-End Demo
npx tsx src/scenarios/feature-first-customer-search.ts

# TrialRun · 导出 EvidencePackage（含 runtime services 证据 + 静态 IR 摘要）
npx tsx src/scenarios/trialRunEvidence.ts

# Reflection · Build Env 下导出 Static IR（含稳定 digest）
npx tsx src/scenarios/ir/reflectStaticIr.ts
```

## Structure

- `src/scenarios`: Business logic scenarios and demos.
- `src/scenarios/ir`: IR / Parser mapping demos (not business-recommended).
- `src/features`: Feature-first examples (modules/processes/patterns by feature).
- `src/runtime`: Composition Root for demos (root impl + layer).
- `src/patterns`: Reusable logic patterns (e.g. Confirm, Long Task, Bulk Operations).
