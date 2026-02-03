import type { Span } from './span.js'

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const compareSpan = (a: Span, b: Span): number => {
  if (a.start.offset !== b.start.offset) return a.start.offset - b.start.offset
  if (a.end.offset !== b.end.offset) return a.end.offset - b.end.offset
  return 0
}

export const sortByFileSpan = <T extends { readonly file: string; readonly span: Span }>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  Array.from(items).sort((x, y) => {
    const c = compare(x.file, y.file)
    if (c !== 0) return c
    return compareSpan(x.span, y.span)
  })

