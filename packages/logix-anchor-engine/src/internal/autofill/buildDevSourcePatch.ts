import type { AutofillTargetEntry, MissingField } from '../entries.js'
import type { JsonValue, SkipReason } from './model.js'
import { makeSkipReason } from './policy.js'

export const buildDevSourcePatch = (args: {
  readonly target: AutofillTargetEntry & { readonly target: { readonly kind: 'module'; readonly moduleIdLiteral: string } }
  readonly missing: MissingField
}):
  | { readonly ok: true; readonly propertyName: 'dev' | 'source'; readonly valueCode: string; readonly changes: JsonValue }
  | { readonly ok: false; readonly reason: SkipReason } => {
  const loc = args.target.span.start
  if (!loc || loc.line <= 0 || loc.column <= 0) return { ok: false, reason: makeSkipReason('missing_location') }

  const source = {
    file: args.target.file,
    line: loc.line,
    column: loc.column,
  }

  const srcCode = `{ file: ${JSON.stringify(source.file)}, line: ${source.line}, column: ${source.column} }`

  if (args.missing.field === 'dev') {
    return {
      ok: true,
      propertyName: 'dev',
      valueCode: `{ source: ${srcCode} }`,
      changes: { dev: { source } },
    }
  }

  if (args.missing.field === 'source') {
    return {
      ok: true,
      propertyName: 'source',
      valueCode: srcCode,
      changes: { source },
    }
  }

  return { ok: false, reason: makeSkipReason('unsupported_shape', { details: { field: args.missing.field } }) }
}

