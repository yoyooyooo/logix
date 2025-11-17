import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
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
  .add(HttpApiEndpoint.get('health')`/health`.addSuccess(HealthResponse))
  .add(
    HttpApiEndpoint.get('healthProbe')`/health/${HttpApiSchema.param('probe', Schema.NumberFromString)}`.addSuccess(
      HealthProbeResponse,
    ),
  )
