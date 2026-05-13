# Logix Examples

This package contains standalone scenarios and runtime-aligned examples for the current Logix API.

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

# Program-first · Minimal End-to-End Demo
npx tsx src/scenarios/customer-search-minimal.ts

# Runtime Trial · 导出 EvidencePackage（含 runtime services 证据 + 静态 IR 摘要）
npx tsx src/scenarios/trial-run-evidence.ts

# Reflection · Build Env 下导出 Static IR（含稳定 digest）
npx tsx src/scenarios/ir/reflectStaticIr.ts
```

## Structure

- `src/scenarios`: Runtime-aligned scenarios and demos.
- `src/scenarios/ir`: IR / parser mapping demos and expert experiments.
- `src/features`: Scenario-owned programs, logic kits, and verification-adjacent examples.
- `src/runtime`: Demo composition roots and runtime wiring.
- `src/patterns`: Reusable logic and orchestration patterns.
