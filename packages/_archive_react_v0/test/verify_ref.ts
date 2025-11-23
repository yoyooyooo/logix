import { Effect, Stream, SubscriptionRef, pipe } from "effect";

const program = Effect.gen(function* () {
  const ref = yield* SubscriptionRef.make("initial");

  console.log("--- Testing SubscriptionRef.changes with duplicate set ---");
  yield* pipe(
    ref.changes,
    Stream.tap((val) => Effect.sync(() => console.log("Emitted:", val))),
    Stream.runDrain,
    Effect.fork
  );

  yield* Effect.sleep("50 millis");
  console.log("Setting 'updated'...");
  yield* SubscriptionRef.set(ref, "updated");

  yield* Effect.sleep("50 millis");
  console.log("Setting 'updated' again...");
  yield* SubscriptionRef.set(ref, "updated");

  yield* Effect.sleep("50 millis");
  console.log("Setting 'final'...");
  yield* SubscriptionRef.set(ref, "final");
});

void Effect.runPromise(program);
