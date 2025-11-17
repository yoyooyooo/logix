import { Effect } from 'effect'
import * as Debug from '../../src/Debug.js'

export const makeEventCollectorSink = () => {
  const events: Debug.Event[] = []
  const sink: Debug.Sink = {
    record: (event) =>
      Effect.sync(() => {
        events.push(event)
      }),
  }
  return { events, sink }
}
