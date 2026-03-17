import { Data, Effect, ServiceMap } from 'effect'
import type { CustomerSummary } from './model.js'

export class CustomerSearchError extends Data.TaggedError('CustomerSearchError')<{
  readonly message: string
}> {}

export interface CustomerApi {
  readonly search: (keyword: string) => Effect.Effect<ReadonlyArray<CustomerSummary>, CustomerSearchError>
}

export class CustomerApiTag extends ServiceMap.Service<CustomerApiTag, CustomerApi>()('@svc/CustomerApi') {}
