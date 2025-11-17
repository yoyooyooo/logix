import { RuntimeProvider, useModule, useSelector } from '@logix/react'

import { Button } from '@/components/ui/button'
import { appRuntime } from '@/logix/runtime'
import { CounterDef } from '@/logix/counter'

function CounterPanel() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.value)

  console.log(123)

  return (
    <div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Studio FE</h1>
        <p className="text-sm text-muted-foreground">
          Logix Counter · value = <span className="font-mono">{count}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => counter.actions.inc()}>+1</Button>
        <Button variant="secondary" onClick={() => counter.actions.dec()}>
          -1
        </Button>
        <Button variant="outline" onClick={() => counter.actions.reset()}>
          Reset
        </Button>
      </div>
    </div>
  )
}

function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <CounterPanel />
      </div>
    </RuntimeProvider>
  )
}

export default App
