import { getAtPath, updateArrayAtPath } from './path.js'

export type AnyState = Record<string, unknown>

export const isAuxRootPath = (path: string): boolean =>
  path === 'errors' ||
  path === 'ui' ||
  path === '$form' ||
  path.startsWith('errors.') ||
  path.startsWith('ui.') ||
  path.startsWith('$form.')

export const normalizeArrayToLength = (items: ReadonlyArray<unknown>, length: number): Array<unknown | undefined> => {
  const next: Array<unknown | undefined> = items.slice(0, length)
  while (next.length < length) next.push(undefined)
  return next
}

export const syncAuxArrays = (
  state: AnyState,
  path: string,
  currentLength: number,
  update: (items: ReadonlyArray<unknown | undefined>) => ReadonlyArray<unknown | undefined>,
): AnyState => {
  if (!path || isAuxRootPath(path)) return state

  const nextUi = updateArrayAtPath(state, `ui.${path}`, (items) =>
    update(normalizeArrayToLength(items, currentLength)),
  ) as AnyState

  // Canonical shape for list error trees: `$list/rows[]`; row-level errors are always written to `errors.<list>.rows[i]`.
  const nextErrors = updateArrayAtPath(nextUi, `errors.${path}.rows`, (items) =>
    update(normalizeArrayToLength(items, currentLength)),
  ) as AnyState

  const manualRowsPath = `errors.$manual.${path}.rows`
  const nextManualErrors =
    getAtPath(state, manualRowsPath) !== undefined
      ? (updateArrayAtPath(nextErrors, manualRowsPath, (items) =>
          update(normalizeArrayToLength(items, currentLength)),
        ) as AnyState)
      : nextErrors

  const schemaRowsPath = `errors.$schema.${path}.rows`
  const nextSchemaErrors =
    getAtPath(state, schemaRowsPath) !== undefined
      ? (updateArrayAtPath(nextManualErrors, schemaRowsPath, (items) =>
          update(normalizeArrayToLength(items, currentLength)),
        ) as AnyState)
      : nextManualErrors

  return nextSchemaErrors
}
