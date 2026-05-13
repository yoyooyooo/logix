# Inventory: Host Package Templates

## `@logixjs/react`

- Public layer:
  - `src/RuntimeProvider.ts`
  - `src/Hooks.ts`
  - `src/Platform.ts`
  - `src/ReactPlatform.ts`
- Internal layer:
  - `src/internal/provider/**`
  - `src/internal/hooks/**`
  - `src/internal/store/**`
  - `src/internal/platform/**`
- Test layer:
  - `test/RuntimeProvider/**`
  - `test/Platform/**`
  - `test/integration/**`
  - `test/browser/**`

## `@logixjs/sandbox`

- Public layer:
  - `src/Client.ts`
  - `src/Protocol.ts`
  - `src/Service.ts`
  - `src/Vite.ts`
- Internal layer:
  - `src/internal/compiler/**`
  - `src/internal/kernel/**`
  - `src/internal/worker/**`
- Test layer:
  - `test/Client/**`
  - `test/browser/**`

## `@logixjs/test`

- Public layer:
  - `src/Execution.ts`
  - `src/Assertions.ts`
  - `src/TestProgram.ts`
  - `src/TestRuntime.ts`
  - `src/Vitest.ts`
- Internal layer:
  - `src/internal/api/**`
  - `src/internal/runtime/**`
  - `src/internal/utils/**`
- Test layer:
  - `test/TestProgram/**`
  - `test/TestRuntime/**`
  - `test/Vitest/**`

## `@logixjs/devtools-react`

- Public layer:
  - `src/DevtoolsLayer.tsx`
  - `src/LogixDevtools.tsx`
  - `src/FieldGraphView.tsx`
- Internal layer:
  - `src/internal/snapshot/**`
  - `src/internal/state/**`
  - `src/internal/ui/**`
  - `src/internal/theme/**`
- Test layer:
  - `test/internal/**`
  - `test/FieldGraphView/**`
