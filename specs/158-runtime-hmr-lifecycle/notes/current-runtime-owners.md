# Current Runtime Owners

## Observed Owner Pattern

- `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`: module-scope `Logix.Runtime.make`.
- `examples/logix-react/src/demos/AppDemoLayout.tsx`: module-scope `Runtime.make`.
- `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`: module-scope `ManagedRuntime.make`.
- `examples/logix-react/src/demos/form/FormDemoLayout.tsx`: module-scope `Logix.Runtime.make`.
- Additional examples also create runtimes at module scope and will be swept after the target evidence check passes.

## Problem

Module-scope runtime creation gives the module graph implicit ownership. During HMR, the replaced module and the React tree can disagree about the active runtime. That makes resource cleanup and diagnostic evidence incidental.

## Target Owner Model

- Examples keep normal user-facing runtime creation code.
- A host dev lifecycle carrier is enabled once from Vite, Vitest, or a React development entrypoint.
- The carrier provides lifecycle owner, registry, and evidence services to runtime internals through Effect DI or an equivalent internal layer boundary.
- `RuntimeProvider` receives the current runtime and remains a projection boundary.
- React host internals summarize external-store listener, provider overlay, host subscription, and HMR boundary cleanup without becoming the core lifecycle owner.
- Core owns host-neutral cleanup and evidence primitives.
- Any current `createExampleRuntimeOwner(...)` usage is implementation residue from the interrupted helper route and must be removed before closure.
