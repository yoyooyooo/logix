import { make } from "./query.js"
import { layer, QueryClientTag } from "./query-client.js"
import { toStateTraitSpec } from "./traits.js"
import * as TanStack from "./tanstack/observer.js"

export type * from "./query.js"
export type * from "./traits.js"
export type * from "./logics/invalidate.js"

export { QueryClientTag }
export { layer as QueryLayer }

export const Query = {
  make,
  layer,
  traits: toStateTraitSpec,
  TanStack,
} as const
