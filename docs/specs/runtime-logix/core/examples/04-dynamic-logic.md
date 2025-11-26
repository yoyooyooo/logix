# Example: Conditional Logic Execution (v3 Paradigm)

> **Status**: Informational
> **Note**: This document clarifies the standard v3 approach for handling conditional or dynamic business logic.

## Architectural Principle

The v3 Logix architecture is based on a **static, compositional model**. All logic is defined at the time of the `Store`'s creation. There is no runtime API for dynamically adding or removing logic rules from a running store.

## Standard Pattern for Conditional Logic

Conditional logic should be implemented *inside* a `Logic` unit using standard `Effect` control flow operators. The logic is always present, but its execution is conditional based on the current state.

### Example

If a specific validation rule should only apply to VIP users, this is expressed with an `Effect.when` or a simple `if` statement within the logic's `Effect`.

```typescript
const conditionalValidationLogic = Logic.make<FormShape>(({ flow, state }) => 
  Effect.gen(function* (_) {
    const amount$ = flow.fromChanges(s => s.amount);

    const validationEffect = Effect.gen(function* (_) {
      const { isVip, amount } = yield* state.read;

      // The logic is always active, but the effectful part only runs when the condition is met.
      if (isVip && amount < 100) {
        yield* state.mutate(draft => {
          draft.errors.amount = "VIP minimum order is 100";
        });
      }
    });

    yield* amount$.pipe(flow.run(validationEffect));
  })
);
```

This approach ensures that all possible behaviors of a store are statically defined, predictable, and type-safe, aligning with the core principles of the v3 architecture.