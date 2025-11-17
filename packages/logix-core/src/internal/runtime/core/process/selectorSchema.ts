import * as SchemaAST from 'effect/SchemaAST'

export type DotPathSegment = string | number

type DotPathParseResult =
  | { readonly ok: true; readonly segments: ReadonlyArray<DotPathSegment> }
  | { readonly ok: false; readonly error: Error }

export type DotPathSelectorResult =
  | {
      readonly ok: true
      readonly selector: (state: unknown) => unknown
      readonly segments: ReadonlyArray<DotPathSegment>
    }
  | { readonly ok: false; readonly error: Error }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const resolveSchemaAst = (schema: unknown): SchemaAST.AST | undefined => {
  if (!isRecord(schema)) return undefined
  const ast = (schema as any).ast as SchemaAST.AST | undefined
  if (!ast) return undefined
  if (typeof ast !== 'object' && typeof ast !== 'function') return undefined
  return ast
}

const makeDotPathError = (path: string, message: string, hint?: string): Error => {
  const err = new Error(message)
  ;(err as any).code = 'process::invalid_dot_path'
  ;(err as any).hint =
    hint ??
    [
      "Expected dot-path syntax: segments separated by '.', numeric segments represent array indices.",
      `path: ${path}`,
      '',
      'examples:',
      '- count',
      '- user.name',
      '- items.0.id',
    ].join('\n')
  return err
}

const makeSchemaMismatchError = (path: string): Error =>
  makeDotPathError(
    path,
    'Invalid dot-path: path does not match the state schema.',
    [
      'The module state schema does not contain the requested dot-path.',
      `path: ${path}`,
      '',
      'fix:',
      '- Ensure the path exists in the state schema.',
      '- Use numeric segments for array indices (e.g. items.0.id).',
    ].join('\n'),
  )

const parseDotPath = (path: string): DotPathParseResult => {
  if (typeof path !== 'string' || path.length === 0) {
    return { ok: false, error: makeDotPathError(String(path), 'dot-path must be a non-empty string') }
  }

  const raw = path.split('.')
  if (raw.length === 0) {
    return { ok: false, error: makeDotPathError(path, 'dot-path must contain at least one segment') }
  }

  const segments: DotPathSegment[] = []
  for (let i = 0; i < raw.length; i++) {
    const seg = raw[i]!
    if (seg.length === 0) {
      return {
        ok: false,
        error: makeDotPathError(
          path,
          `Invalid dot-path: empty segment at index ${i}.`,
          [
            "Expected dot-path syntax: segments separated by '.', numeric segments represent array indices.",
            `path: ${path}`,
            '',
            'examples:',
            '- count',
            '- user.name',
            '- items.0.id',
            '',
            'fix:',
            '- Remove consecutive dots or trailing dots.',
          ].join('\n'),
        ),
      }
    }

    if (/^[0-9]+$/.test(seg)) {
      const n = Number(seg)
      if (!Number.isFinite(n) || n < 0) {
        return {
          ok: false,
          error: makeDotPathError(path, `Invalid array index segment "${seg}" at index ${i}.`),
        }
      }
      segments.push(Math.floor(n))
      continue
    }

    segments.push(seg)
  }

  return { ok: true, segments }
}

const resolveAstForPath = (
  ast: SchemaAST.AST,
  segments: ReadonlyArray<DotPathSegment>,
  seen: Set<SchemaAST.AST>,
): SchemaAST.AST | undefined => {
  if (segments.length === 0) return ast

  let current = ast
  while (true) {
    if (SchemaAST.isSuspend(current)) {
      if (seen.has(current)) return undefined
      seen.add(current)
      current = current.f()
      continue
    }
    if (SchemaAST.isRefinement(current)) {
      current = current.from
      continue
    }
    break
  }

  if (SchemaAST.isTransformation(current)) {
    const from = resolveAstForPath(current.from, segments, seen)
    if (from) return from
    return resolveAstForPath(current.to, segments, seen)
  }

  if (SchemaAST.isUnion(current)) {
    for (const node of current.types) {
      const resolved = resolveAstForPath(node, segments, seen)
      if (resolved) return resolved
    }
    return undefined
  }

  if (SchemaAST.isTupleType(current)) {
    const [head, ...tail] = segments
    if (typeof head !== 'number') return undefined
    const element =
      head < current.elements.length ? current.elements[head] : current.rest.length > 0 ? current.rest[0] : undefined
    return element ? resolveAstForPath(element.type, tail, seen) : undefined
  }

  if (SchemaAST.isTypeLiteral(current)) {
    const [head, ...tail] = segments
    if (head === undefined) return undefined

    if (typeof head === 'string') {
      for (const ps of current.propertySignatures) {
        if (String(ps.name) !== head) continue
        return resolveAstForPath(ps.type, tail, seen)
      }
    }

    for (const sig of current.indexSignatures) {
      let param: SchemaAST.AST = sig.parameter as unknown as SchemaAST.AST
      while (SchemaAST.isRefinement(param)) {
        param = param.from
      }
      const tag = (param as any)?._tag
      const acceptsString = tag === 'StringKeyword' || tag === 'TemplateLiteral'
      const acceptsNumber = tag === 'NumberKeyword'
      if (typeof head === 'string' && acceptsString) {
        return resolveAstForPath(sig.type, tail, seen)
      }
      if (typeof head === 'number' && acceptsNumber) {
        return resolveAstForPath(sig.type, tail, seen)
      }
    }
  }

  const tag = (current as any)?._tag
  if (tag === 'AnyKeyword' || tag === 'UnknownKeyword' || tag === 'ObjectKeyword' || tag === 'Declaration') {
    return current
  }

  return undefined
}

const selectBySegments =
  (segments: ReadonlyArray<DotPathSegment>) =>
  (state: unknown): unknown => {
    let current: unknown = state
    for (const seg of segments) {
      if (current == null) return undefined
      if (typeof seg === 'number') {
        if (Array.isArray(current)) {
          current = current[seg]
          continue
        }
        if (isRecord(current)) {
          current = current[String(seg)]
          continue
        }
        return undefined
      }
      if (isRecord(current)) {
        current = current[seg]
        continue
      }
      return undefined
    }
    return current
  }

export const makeSchemaSelector = (path: string, schemaAst?: SchemaAST.AST): DotPathSelectorResult => {
  const parsed = parseDotPath(path)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  if (schemaAst) {
    const resolved = resolveAstForPath(schemaAst, parsed.segments, new Set())
    if (!resolved) {
      return { ok: false, error: makeSchemaMismatchError(path) }
    }
  }

  return {
    ok: true,
    selector: selectBySegments(parsed.segments),
    segments: parsed.segments,
  }
}
