import { HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'
import { Schema } from 'effect'

export const HealthResponse = Schema.Struct({
  ok: Schema.Boolean,
  db: Schema.String,
})

export const HealthProbeResponse = Schema.Struct({
  ok: Schema.Boolean,
  db: Schema.String,
  probe: Schema.Number,
})

export const HealthGroup = HttpApiGroup.make('Health')
  .add(
    HttpApiEndpoint.get('health', '/health', { success: HealthResponse }),
    HttpApiEndpoint.get('healthProbe', '/health/:probe', {
      params: { probe: Schema.NumberFromString },
      success: HealthProbeResponse,
    }),
  )
