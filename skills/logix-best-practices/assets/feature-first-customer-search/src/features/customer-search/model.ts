import { Schema } from 'effect'

export interface CustomerSummary {
  readonly id: string
  readonly name: string
}

export const CustomerSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})

