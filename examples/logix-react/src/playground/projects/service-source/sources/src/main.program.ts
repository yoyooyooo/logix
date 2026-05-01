import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { search } from './services/search.service'

const SearchDemo = Logix.Module.make('ServiceSourceSearchDemo', {
  state: Schema.Struct({ query: Schema.String, resultCount: Schema.Number }),
  actions: {
    searchRequested: Schema.String,
  },
  reducers: {},
})

export const Program = Logix.Program.make(SearchDemo, {
  initial: { query: 'logix', resultCount: search('logix').length },
  logics: [],
})

export const main = () =>
  Effect.succeed({
    query: 'logix',
    resultCount: search('logix').length,
  })
