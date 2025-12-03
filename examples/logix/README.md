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
```

## Structure

- `src/scenarios`: Business logic scenarios and demos.
- `src/patterns`: Reusable logic patterns (e.g. Confirm, Long Task, Bulk Operations).
