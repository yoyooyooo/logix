export interface SearchResult {
  readonly id: string
  readonly title: string
}

export const search = (query: string): ReadonlyArray<SearchResult> => [
  { id: 'result-1', title: `${query} quickstart` },
]
