import { useEffect, useState } from "react"
import { Stream, Effect, Fiber } from "effect"
import type { FormControl } from "../.."

interface FormValuesPanelProps<A> {
  control: FormControl<A> | null
  title?: string
}

export function FormValuesPanel<A>({ control, title = "实时值" }: FormValuesPanelProps<A>) {
  const [values, setValues] = useState<A | null>(null)

  useEffect(() => {
    if (!control) return

    const fiber = Effect.runFork(
      Stream.runForEach(control.store.values$, (v) => Effect.sync(() => setValues(v)))
    )

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [control])

  return (
    <div className="p-3 bg-gray-50 rounded font-mono text-[11px] leading-relaxed">
      <div className="text-gray-500 mb-1">{title}</div>
      <pre className="whitespace-pre-wrap">{values ? JSON.stringify(values, null, 2) : "loading..."}</pre>
    </div>
  )
}
