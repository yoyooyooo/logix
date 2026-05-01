# Example Runtime Callsite Inventory

## Primary Conversion Set

- `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- `examples/logix-react/src/demos/AppDemoLayout.tsx`
- `examples/logix-react/src/demos/form/FormDemoLayout.tsx`

## Additional Runtime Callsites To Sweep

- `examples/logix-react/src/demos/FractalRuntimeLayout.tsx`
- `examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx`
- `examples/logix-react/src/demos/CounterWithProfileDemo.tsx`
- `examples/logix-react/src/demos/SuspenseModuleLayout.tsx`
- `examples/logix-react/src/demos/LocalModuleLayout.tsx`
- `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- `examples/logix-react/src/demos/DiShowcaseLayout.tsx`
- `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- `examples/logix-react/src/demos/form/FormFieldArraysDemoLayout.tsx`
- `examples/logix-react/src/demos/form/FormFieldSourceDemoLayout.tsx`
- `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- `examples/logix-react/src/demos/form/FormCompanionDemoLayout.tsx`
- `examples/logix-react/src/modules/querySearchDemo.ts`

## Rule

The implementation keeps example source aligned with the target authoring surface. Runtime call sites remain normal `Runtime.make` or `ManagedRuntime.make` code. HMR lifecycle support is supplied by one host dev lifecycle carrier configured outside demo source.

The dogfood sweep must remove long-term bespoke `import.meta.hot.dispose` snippets, direct runtime owner construction, and any `createExampleRuntimeOwner(...)` calls introduced by the interrupted helper route.
