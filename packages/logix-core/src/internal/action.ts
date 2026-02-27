import { Schema } from 'effect'

export type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

type DevSource = {
  readonly file: string
  readonly line: number
  readonly column: number
}

export type ActionValue<Tag extends string, Payload> = Payload extends void
  ? {
      readonly _tag: Tag
      readonly payload?: Payload
    }
  : {
      readonly _tag: Tag
      readonly payload: Payload
    }

export type ActionCreator<Tag extends string, Payload> = ActionFn<Payload, ActionValue<Tag, Payload>>

export type ActionToken<
  Tag extends string,
  Payload,
  PayloadSchema extends Schema.Schema<any, any, any> = Schema.Schema<any, any, any>,
> = ActionCreator<Tag, Payload> & {
  readonly _kind: 'ActionToken'
  readonly tag: Tag
  readonly schema: PayloadSchema
  readonly source?: DevSource
}

export type AnyActionToken = ActionToken<string, any, Schema.Schema<any, any, any>>
export type ActionPayloadOfToken<T> = T extends ActionToken<any, infer P, any> ? P : never

export const isActionToken = (value: unknown): value is AnyActionToken =>
  typeof value === 'function' &&
  (value as any)._kind === 'ActionToken' &&
  typeof (value as any).tag === 'string' &&
  Schema.isSchema((value as any).schema)

export const make = <Tag extends string, PayloadSchema extends Schema.Schema<any, any, any>>(
  tag: Tag,
  schema: PayloadSchema,
  options?: { readonly source?: DevSource },
): ActionToken<Tag, Schema.Schema.Type<PayloadSchema>, PayloadSchema> => {
  const fn = ((...args: readonly [unknown?]) => ({
    _tag: tag,
    payload: args[0],
  })) as unknown as ActionToken<Tag, Schema.Schema.Type<PayloadSchema>, PayloadSchema>

  ;(fn as any)._kind = 'ActionToken'
  ;(fn as any).tag = tag
  ;(fn as any).schema = schema
  if (options?.source) {
    ;(fn as any).source = options.source
  }

  return fn
}

export const makeActions = <M extends Record<string, Schema.Schema<any, any, any>>>(
  schemas: M,
  options?: {
    readonly source?: DevSource
    readonly sources?: Partial<Record<Extract<keyof M, string>, DevSource>>
  },
): {
  readonly [K in keyof M]: ActionToken<Extract<K, string>, Schema.Schema.Type<M[K]>, M[K]>
} => {
  const out: Record<string, AnyActionToken> = {}
  const sources = options?.sources as Record<string, DevSource | undefined> | undefined
  const defaultSource = options?.source
  for (const [key, schema] of Object.entries(schemas)) {
    const source = sources?.[key] ?? defaultSource
    out[key] = make(key, schema, source ? { source } : undefined)
  }
  return out as any
}

export type ActionDef = Schema.Schema<any, any, any> | AnyActionToken
export type ActionDefs = Record<string, ActionDef>

export type NormalizedActionTokens<M extends ActionDefs> = {
  readonly [K in keyof M]: M[K] extends Schema.Schema<any, any, any>
    ? ActionToken<Extract<K, string>, Schema.Schema.Type<M[K]>, M[K]>
    : M[K] extends ActionToken<any, infer P, infer S>
      ? ActionToken<Extract<K, string>, P, S>
      : never
}

export const normalizeActions = <M extends ActionDefs>(defs: M): NormalizedActionTokens<M> => {
  const out: Record<string, AnyActionToken> = {}

  for (const [key, def] of Object.entries(defs)) {
    if (Schema.isSchema(def)) {
      out[key] = make(key, def)
      continue
    }

    if (isActionToken(def)) {
      if (def.tag !== key) {
        throw new Error(`[Logix.Action] actionTag MUST equal key: key="${key}", token.tag="${def.tag}"`)
      }
      out[key] = def
      continue
    }

    throw new Error(`[Logix.Action] invalid action def for key "${key}"`)
  }

  return out as any
}

export type ActionIntentEntry = 'dispatchers' | 'action' | 'dispatch'
export type ActionIntentInput = 'token' | 'type' | 'value'

export type ActionIntentSource = {
  readonly entry: ActionIntentEntry
  readonly input: ActionIntentInput
}

export type ActionIntent<A = unknown> = {
  readonly action: A
  readonly actionTag: string
  readonly source: ActionIntentSource
}

const resolveActionTag = (action: unknown): string => {
  const tag = (action as any)?._tag
  if (typeof tag === 'string' && tag.length > 0) {
    return tag
  }

  const type = (action as any)?.type
  if (typeof type === 'string' && type.length > 0) {
    return type
  }

  if (tag != null) {
    return String(tag)
  }
  if (type != null) {
    return String(type)
  }
  return 'unknown'
}

export const actionTagOf = (action: unknown): string => resolveActionTag(action)

const makeActionIntent = <A>(action: A, source: ActionIntentSource): ActionIntent<A> => ({
  action,
  actionTag: resolveActionTag(action),
  source,
})

export const intentFromToken = <
  Tag extends string,
  Payload,
  PayloadSchema extends Schema.Schema<any, any, any> = Schema.Schema<any, any, any>,
>(
  token: ActionToken<Tag, Payload, PayloadSchema>,
  args: ActionArgs<Payload>,
  entry: ActionIntentEntry,
): ActionIntent<ActionValue<Tag, Payload>> =>
  makeActionIntent((token as any)(...args), {
    entry,
    input: 'token',
  })

export const intentFromType = <A = unknown>(
  type: string,
  payload: unknown,
  entry: ActionIntentEntry,
): ActionIntent<A> =>
  makeActionIntent(
    {
      _tag: type,
      payload,
    } as A,
    {
      entry,
      input: 'type',
    },
  )

export const intentFromValue = <A>(action: A, entry: ActionIntentEntry): ActionIntent<A> =>
  makeActionIntent(action, {
    entry,
    input: 'value',
  })
