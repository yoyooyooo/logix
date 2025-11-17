import { getAtPath, setAtPath, unsetAtPath, updateArrayAtPath } from './path.js'
import { toManualErrorsPath, toSchemaErrorsPath } from '../../Path.js'
import { countErrorLeaves, readErrorCount, writeErrorCount } from './errors.js'
import { isAuxRootPath, syncAuxArrays, type AnyState } from './arrays.js'

type PatchSink = ((path: string) => void) | undefined

const mark = (sink: PatchSink, path: string): void => {
  if (!sink) return
  if (typeof path !== 'string' || path.length === 0) return
  sink(path)
}

const markMany = (sink: PatchSink, paths: ReadonlyArray<string>): void => {
  for (const path of paths) {
    mark(sink, path)
  }
}

type FieldUiMeta = {
  readonly touched?: boolean
  readonly dirty?: boolean
}

const mergeUiMeta = (prev: unknown, patch: FieldUiMeta): FieldUiMeta => {
  const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? (prev as Record<string, unknown>) : {}
  return {
    ...base,
    ...patch,
  }
}

const setUiMeta = (state: unknown, path: string, patch: FieldUiMeta): unknown => {
  if (!path) return state
  const prev = getAtPath(state, `ui.${path}`)
  return setAtPath(state, `ui.${path}`, mergeUiMeta(prev, patch))
}

const initialMeta = (): AnyState => ({
  submitCount: 0,
  isSubmitting: false,
  isDirty: false,
  errorCount: 0,
})

export const makeFormReducers = <TValues extends object>(params: { readonly initialValues: TValues }): any => {
  const reducers: any = {
    setValue: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path
      const prevErrorCount = readErrorCount(state)

      // errors.* write-back (e.g. schema/root validate): keep errorCount incrementally consistent.
      if (path === 'errors' || path.startsWith('errors.')) {
        mark(sink, path)
        const prev = getAtPath(state, path)
        const nextValue = action.payload.value
        const delta = countErrorLeaves(nextValue) - countErrorLeaves(prev)
        const next = setAtPath(state, path, nextValue) as AnyState
        if (delta === 0) return next
        mark(sink, '$form.errorCount')
        return writeErrorCount(next, prevErrorCount + delta) as AnyState
      }

      mark(sink, path)
      const next = setAtPath(state, path, action.payload.value) as AnyState
      if (isAuxRootPath(path)) return next

      markMany(sink, [`ui.${path}`, '$form.isDirty'])

      const nextMeta = setAtPath(next, '$form.isDirty', true) as AnyState
      let nextUi = setUiMeta(nextMeta, path, { dirty: true }) as AnyState
      let nextCount = prevErrorCount

      const manualPath = toManualErrorsPath(path)
      const prevManual = getAtPath(nextUi, manualPath)
      if (prevManual !== undefined) {
        mark(sink, manualPath)
        nextCount -= countErrorLeaves(prevManual)
        nextUi = unsetAtPath(nextUi, manualPath) as AnyState
      }

      const schemaPath = toSchemaErrorsPath(path)
      const prevSchema = getAtPath(nextUi, schemaPath)
      if (prevSchema !== undefined) {
        mark(sink, schemaPath)
        nextCount -= countErrorLeaves(prevSchema)
        nextUi = unsetAtPath(nextUi, schemaPath) as AnyState
      }

      if (nextCount === prevErrorCount) return nextUi
      mark(sink, '$form.errorCount')
      return writeErrorCount(nextUi, nextCount) as AnyState
    },
    blur: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path
      if (isAuxRootPath(path)) return state as AnyState
      mark(sink, `ui.${path}`)
      return setUiMeta(state, path, { touched: true }) as AnyState
    },
    validate: (state: AnyState) => state as AnyState,
    validatePaths: (state: AnyState) => state as AnyState,
    submitAttempt: (state: AnyState, _action: any, sink: PatchSink) => {
      const prev = (state as any).$form
      const submitCount =
        prev && typeof prev === 'object' && !Array.isArray(prev) && typeof prev.submitCount === 'number'
          ? prev.submitCount
          : 0
      mark(sink, '$form.submitCount')
      return setAtPath(state, '$form.submitCount', submitCount + 1) as AnyState
    },
    setSubmitting: (state: AnyState, action: any, sink: PatchSink) => {
      mark(sink, '$form.isSubmitting')
      return setAtPath(state, '$form.isSubmitting', action.payload) as AnyState
    },
    reset: (_state: AnyState, action: any, sink: PatchSink) => {
      const values =
        action.payload && typeof action.payload === 'object' ? (action.payload as TValues) : params.initialValues

      markMany(sink, ['errors', 'ui', '$form'])
      if (values && typeof values === 'object' && !Array.isArray(values)) {
        for (const key of Object.keys(values)) {
          if (!key || isAuxRootPath(key)) continue
          mark(sink, key)
        }
      }

      return {
        ...(values as any),
        errors: {},
        ui: {},
        $form: initialMeta(),
      } as AnyState
    },
    setError: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path
      if (!path || isAuxRootPath(path)) return state as AnyState
      const error = action.payload.error
      const manualPath = toManualErrorsPath(path)
      mark(sink, manualPath)

      const prevErrorCount = readErrorCount(state)
      const prevManual = getAtPath(state, manualPath)

      if (error === null || error === undefined) {
        const next = unsetAtPath(state, manualPath) as AnyState
        const delta = -countErrorLeaves(prevManual)
        if (delta === 0) return next
        mark(sink, '$form.errorCount')
        return writeErrorCount(next, prevErrorCount + delta) as AnyState
      }
      const next = setAtPath(state, manualPath, error) as AnyState
      const delta = countErrorLeaves(error) - countErrorLeaves(prevManual)
      if (delta === 0) return next
      mark(sink, '$form.errorCount')
      return writeErrorCount(next, prevErrorCount + delta) as AnyState
    },
    clearErrors: (state: AnyState, action: any, sink: PatchSink) => {
      const paths = action.payload
      const prevErrorCount = readErrorCount(state)

      if (paths === undefined) {
        const prevManual = getAtPath(state, 'errors.$manual')
        mark(sink, 'errors.$manual')
        const next = unsetAtPath(state, 'errors.$manual') as AnyState
        const delta = -countErrorLeaves(prevManual)
        if (delta === 0) return next
        mark(sink, '$form.errorCount')
        return writeErrorCount(next, prevErrorCount + delta) as AnyState
      }

      let next: unknown = state
      let nextCount = prevErrorCount
      for (const path of paths) {
        if (typeof path !== 'string' || !path || isAuxRootPath(path)) continue
        const manualPath = toManualErrorsPath(path)
        const prevManual = getAtPath(next, manualPath)
        if (prevManual !== undefined) {
          mark(sink, manualPath)
          nextCount -= countErrorLeaves(prevManual)
          next = unsetAtPath(next, manualPath)
        }
      }
      const out = next as AnyState
      if (nextCount === prevErrorCount) return out
      mark(sink, '$form.errorCount')
      return writeErrorCount(out, nextCount) as AnyState
    },
    arrayAppend: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path as string
      const value = action.payload.value
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      markMany(sink, [path, `ui.${path}`, `errors.${path}.rows`, '$form.isDirty'])
      if (getAtPath(state, `errors.$manual.${path}.rows`) !== undefined) {
        mark(sink, `errors.$manual.${path}.rows`)
      }
      if (getAtPath(state, `errors.$schema.${path}.rows`) !== undefined) {
        mark(sink, `errors.$schema.${path}.rows`)
      }
      const nextState = updateArrayAtPath(state, path, (items) => [...items, value]) as AnyState
      const nextSync = syncAuxArrays(nextState, path, currentItems.length, (items) => [...items, undefined]) as AnyState
      const schemaRootPath = toSchemaErrorsPath(path)
      const prevErrorCount = readErrorCount(nextSync)
      const prevSchema = getAtPath(nextSync, schemaRootPath)
      mark(sink, schemaRootPath)
      const clearedSchema = unsetAtPath(nextSync, schemaRootPath) as AnyState
      const delta = -countErrorLeaves(prevSchema)
      const nextWithCount =
        delta === 0 ? clearedSchema : (writeErrorCount(clearedSchema, prevErrorCount + delta) as AnyState)
      if (delta !== 0) mark(sink, '$form.errorCount')
      return isAuxRootPath(path) ? nextWithCount : (setAtPath(nextWithCount, '$form.isDirty', true) as AnyState)
    },
    arrayPrepend: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path as string
      const value = action.payload.value
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      markMany(sink, [path, `ui.${path}`, `errors.${path}.rows`, '$form.isDirty'])
      if (getAtPath(state, `errors.$manual.${path}.rows`) !== undefined) {
        mark(sink, `errors.$manual.${path}.rows`)
      }
      if (getAtPath(state, `errors.$schema.${path}.rows`) !== undefined) {
        mark(sink, `errors.$schema.${path}.rows`)
      }
      const nextState = updateArrayAtPath(state, path, (items) => [value, ...items]) as AnyState
      const nextSync = syncAuxArrays(nextState, path, currentItems.length, (items) => [undefined, ...items]) as AnyState
      const schemaRootPath = toSchemaErrorsPath(path)
      const prevErrorCount = readErrorCount(nextSync)
      const prevSchema = getAtPath(nextSync, schemaRootPath)
      mark(sink, schemaRootPath)
      const clearedSchema = unsetAtPath(nextSync, schemaRootPath) as AnyState
      const delta = -countErrorLeaves(prevSchema)
      const nextWithCount =
        delta === 0 ? clearedSchema : (writeErrorCount(clearedSchema, prevErrorCount + delta) as AnyState)
      if (delta !== 0) mark(sink, '$form.errorCount')
      return isAuxRootPath(path) ? nextWithCount : (setAtPath(nextWithCount, '$form.isDirty', true) as AnyState)
    },
    arrayRemove: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path as string
      const index = action.payload.index as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const prevErrorCount = readErrorCount(state)
      const prevRuleRow = getAtPath(state, `errors.${path}.rows.${index}`)
      const prevManualRow = getAtPath(state, `errors.$manual.${path}.rows.${index}`)
      const schemaRootPath = toSchemaErrorsPath(path)
      const prevSchemaRoot = getAtPath(state, schemaRootPath)

      markMany(sink, [path, `ui.${path}`, `errors.${path}.rows`, schemaRootPath, '$form.isDirty'])
      if (getAtPath(state, `errors.$manual.${path}.rows`) !== undefined) {
        mark(sink, `errors.$manual.${path}.rows`)
      }
      if (getAtPath(state, `errors.$schema.${path}.rows`) !== undefined) {
        mark(sink, `errors.$schema.${path}.rows`)
      }

      const nextState = updateArrayAtPath(state, path, (items) =>
        items.filter((_: unknown, i: number) => i !== index),
      ) as AnyState
      const nextSync = syncAuxArrays(nextState, path, currentItems.length, (items) =>
        items.filter((_: unknown, i: number) => i !== index),
      ) as AnyState
      let nextCount = prevErrorCount
      nextCount -= countErrorLeaves(prevRuleRow)
      nextCount -= countErrorLeaves(prevManualRow)
      nextCount -= countErrorLeaves(prevSchemaRoot)

      const clearedSchema = unsetAtPath(nextSync, schemaRootPath) as AnyState
      const nextWithCount =
        nextCount === prevErrorCount ? clearedSchema : (writeErrorCount(clearedSchema, nextCount) as AnyState)
      if (nextCount !== prevErrorCount) mark(sink, '$form.errorCount')
      return isAuxRootPath(path) ? nextWithCount : (setAtPath(nextWithCount, '$form.isDirty', true) as AnyState)
    },
    arraySwap: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path as string
      const a = action.payload.indexA as number
      const b = action.payload.indexB as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const schemaRootPath = toSchemaErrorsPath(path)
      markMany(sink, [path, `ui.${path}`, `errors.${path}.rows`, schemaRootPath, '$form.isDirty'])
      if (getAtPath(state, `errors.$manual.${path}.rows`) !== undefined) {
        mark(sink, `errors.$manual.${path}.rows`)
      }
      if (getAtPath(state, `errors.$schema.${path}.rows`) !== undefined) {
        mark(sink, `errors.$schema.${path}.rows`)
      }

      const swap = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> => {
        const next = items.slice()
        if (a >= 0 && b >= 0 && a < next.length && b < next.length) {
          const tmp = next[a]
          next[a] = next[b]
          next[b] = tmp
        }
        return next
      }

      const nextState = updateArrayAtPath(state, path, swap) as AnyState
      const nextSync = syncAuxArrays(nextState, path, currentItems.length, swap) as AnyState
      const prevErrorCount = readErrorCount(nextSync)
      const prevSchema = getAtPath(nextSync, schemaRootPath)
      const clearedSchema = unsetAtPath(nextSync, schemaRootPath) as AnyState
      const delta = -countErrorLeaves(prevSchema)
      const nextWithCount =
        delta === 0 ? clearedSchema : (writeErrorCount(clearedSchema, prevErrorCount + delta) as AnyState)
      if (delta !== 0) mark(sink, '$form.errorCount')
      return isAuxRootPath(path) ? nextWithCount : (setAtPath(nextWithCount, '$form.isDirty', true) as AnyState)
    },
    arrayMove: (state: AnyState, action: any, sink: PatchSink) => {
      const path = action.payload.path as string
      const from = action.payload.from as number
      const to = action.payload.to as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const schemaRootPath = toSchemaErrorsPath(path)
      markMany(sink, [path, `ui.${path}`, `errors.${path}.rows`, schemaRootPath, '$form.isDirty'])
      if (getAtPath(state, `errors.$manual.${path}.rows`) !== undefined) {
        mark(sink, `errors.$manual.${path}.rows`)
      }
      if (getAtPath(state, `errors.$schema.${path}.rows`) !== undefined) {
        mark(sink, `errors.$schema.${path}.rows`)
      }

      const move = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> => {
        const next = items.slice()
        if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
          return next
        }
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      }

      const nextState = updateArrayAtPath(state, path, move) as AnyState
      const nextSync = syncAuxArrays(nextState, path, currentItems.length, move) as AnyState
      const prevErrorCount = readErrorCount(nextSync)
      const prevSchema = getAtPath(nextSync, schemaRootPath)
      const clearedSchema = unsetAtPath(nextSync, schemaRootPath) as AnyState
      const delta = -countErrorLeaves(prevSchema)
      const nextWithCount =
        delta === 0 ? clearedSchema : (writeErrorCount(clearedSchema, prevErrorCount + delta) as AnyState)
      if (delta !== 0) mark(sink, '$form.errorCount')
      return isAuxRootPath(path) ? nextWithCount : (setAtPath(nextWithCount, '$form.isDirty', true) as AnyState)
    },
  }

  return reducers
}
