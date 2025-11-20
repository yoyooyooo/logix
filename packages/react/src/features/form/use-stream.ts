import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { useEffect, useState } from "react"

export function useStream<A>(
  stream: Stream.Stream<A, never, never>,
  initialValue: A,
) {
  const [value, setValue] = useState<A>(initialValue)

  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(stream, (a) => Effect.sync(() => setValue(a))),
    )

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [stream])

  return value
}
