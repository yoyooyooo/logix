import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { QueryClient } from '@tanstack/query-core'
import * as Query from '@logix/query'

const SearchKeySchema = Schema.Struct({
  keyword: Schema.String,
  page: Schema.Number,
})

const DetailKeySchema = Schema.Struct({
  id: Schema.String,
})

const PageSize = 6 as const

type SearchItem = {
  readonly id: string
  readonly title: string
  readonly keywords: ReadonlyArray<string>
}

const SearchDataset: ReadonlyArray<SearchItem> = (() => {
  const words = [
    'apple',
    'banana',
    'coffee',
    'dog',
    'earphone',
    'flower',
    'game',
    'hotel',
    'island',
    'jazz',
    'keyboard',
    'lamp',
  ] as const

  return Array.from({ length: 96 }, (_, i) => {
    const index = i + 1
    const primary = words[i % words.length]!
    const secondary = words[(i + 3) % words.length]!

    return {
      id: `item-${String(index).padStart(3, '0')}`,
      title: `${primary} / ${secondary} · Result #${index}`,
      keywords: [primary, secondary],
    }
  })
})()

const normalizeKeyword = (input: string): string => input.trim().toLowerCase()

const matchKeyword = (item: SearchItem, keyword: string): boolean => {
  if (!keyword) return true
  const haystack = `${item.id} ${item.title}`.toLowerCase()
  if (haystack.includes(keyword)) return true
  return item.keywords.some((k) => k.toLowerCase().includes(keyword))
}

const clampPage = (page: number): number => (Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1)

export const SearchSpec = Logix.Resource.make({
  id: 'demo/query/search',
  keySchema: SearchKeySchema,
  load: (key: { readonly keyword: string; readonly page: number }) => {
    const keyword = normalizeKeyword(key.keyword)
    const page = clampPage(key.page)
    const latencyMs = keyword ? 1000 : 200

    const filtered = SearchDataset.filter((item) => matchKeyword(item, keyword))

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / PageSize))
    const start = (page - 1) * PageSize
    const items = filtered.slice(start, start + PageSize)
    const hasPrev = page > 1
    const hasNext = start + PageSize < total

    return Effect.sleep(Duration.millis(latencyMs)).pipe(
      Effect.zipRight(
        Effect.succeed({
          keyword,
          page,
          pageSize: PageSize,
          total,
          totalPages,
          hasPrev,
          hasNext,
          items,
        }),
      ),
    )
  },
})

export const DetailSpec = Logix.Resource.make({
  id: 'demo/query/detail',
  keySchema: DetailKeySchema,
  load: (key: { readonly id: string }) =>
    Effect.sleep(Duration.millis(150)).pipe(
      Effect.zipRight(
        Effect.succeed({
          id: key.id,
          title: `Detail: ${key.id}`,
          description: '该数据由 ResourceSpec.load 产生，并通过 Query 领域包写回到模块 state 作为可回放快照。',
        }),
      ),
    ),
})

export const ParamsSchema = Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  selectedId: Schema.NullOr(Schema.String),
})

export type Params = Schema.Schema.Type<typeof ParamsSchema>

export type Ui = {
  readonly query: {
    readonly autoEnabled: boolean
  }
}

const initialUi: Ui = {
  query: { autoEnabled: true },
}

export const SearchQuery = Query.make('QuerySearchDemo', {
  params: ParamsSchema,
  initialParams: { q: '', page: 1, selectedId: null },
  ui: initialUi,
  queries: ($) => ({
    search: $.source({
      resource: SearchSpec,
      deps: ['params.q', 'params.page', 'ui.query.autoEnabled'],
      triggers: ['onMount', 'onKeyChange'],
      debounceMs: 200,
      concurrency: 'switch',
      key: (q, page, autoEnabled) => {
        if (!autoEnabled) return undefined
        const keyword = normalizeKeyword(q)
        return { keyword, page }
      },
    }),
    detail: $.source({
      resource: DetailSpec,
      deps: ['params.selectedId'],
      triggers: ['onKeyChange'],
      concurrency: 'switch',
      key: (selectedId) => (selectedId ? { id: selectedId } : undefined),
    }),
  }),
})

// Host Module：演示 Query module（其 `.impl` 是 ModuleImpl）作为子模块，被引入到另一个 program module 中。
export const QuerySearchDemoHostDef = Logix.Module.make('QuerySearchDemoHost', {
  state: Schema.Void,
  actions: {
    noop: Schema.Void,
  },
})

export const QuerySearchDemoHostModule = QuerySearchDemoHostDef.implement({
  initial: undefined,
  imports: [SearchQuery.impl],
})

const AppLayer = Layer.mergeAll(
  Logix.Resource.layer([SearchSpec, DetailSpec]),
  Query.Engine.layer(
    Query.TanStack.engine(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 36_000,
          },
        },
      }),
    ),
  ),
)

export const queryRuntime = Logix.Runtime.make(QuerySearchDemoHostModule, {
  label: 'QuerySearchDemo',
  devtools: true,
  layer: AppLayer,
  middleware: [Query.Engine.middleware()],
})
