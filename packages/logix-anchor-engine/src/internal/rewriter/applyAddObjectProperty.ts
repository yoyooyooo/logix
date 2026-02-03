import { Node, Project, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph'

import { insertSpanForObjectLiteral, isObjectPropertyDeclared } from '../missingField.js'
import type { Span } from '../span.js'
import { ReasonCodes } from './reasonCodes.js'
import type { PropertyWrite } from './model.js'

const isIdentifierName = (name: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)

const propertyNameCode = (name: string): string => (isIdentifierName(name) ? name : JSON.stringify(name))

const detectEol = (text: string): string => (text.includes('\r\n') ? '\r\n' : '\n')

const lineStartAt = (text: string, offset: number): number => {
  if (offset <= 0) return 0
  const idx = text.lastIndexOf('\n', offset - 1)
  return idx >= 0 ? idx + 1 : 0
}

const indentAtLine = (text: string, offset: number): string => {
  const start = lineStartAt(text, offset)
  let i = start
  while (i < text.length) {
    const ch = text[i]
    if (ch !== ' ' && ch !== '\t') break
    i += 1
  }
  return text.slice(start, i)
}

const lastNonWhitespaceIndexBefore = (text: string, from: number, toExclusive: number): number => {
  let i = Math.min(text.length, toExclusive) - 1
  while (i >= from) {
    const ch = text[i]
    if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r') return i
    i -= 1
  }
  return -1
}

const hasTrailingCommaBeforeCloseBrace = (text: string, obj: ObjectLiteralExpression): boolean => {
  const closeBraceOffset = Math.max(obj.getStart(), obj.getEnd() - 1)
  const idx = lastNonWhitespaceIndexBefore(text, obj.getStart(), closeBraceOffset)
  return idx >= 0 && text[idx] === ','
}

const findTargetObjectLiteral = (args: {
  readonly fileText: string
  readonly filePathAbs: string
  readonly targetSpan: Span
}): { readonly object?: ObjectLiteralExpression; readonly reasonCodes?: ReadonlyArray<string> } => {
  const project = new Project({ useInMemoryFileSystem: true })
  const sourceFile = project.createSourceFile(args.filePathAbs, args.fileText, { overwrite: true })

  const objects = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
  const candidates: ObjectLiteralExpression[] = []

  const isPoint = args.targetSpan.start.offset === args.targetSpan.end.offset
  const targetOffset = args.targetSpan.start.offset

  for (const obj of objects) {
    if (isPoint) {
      if (obj.getStart() <= targetOffset && targetOffset <= obj.getEnd()) candidates.push(obj)
      continue
    }

    if (obj.getStart() === args.targetSpan.start.offset && obj.getEnd() === args.targetSpan.end.offset) {
      candidates.push(obj)
    }
  }

  if (candidates.length === 0) {
    return { reasonCodes: [ReasonCodes.targetObjectNotFound] }
  }

  if (candidates.length > 1 && isPoint) {
    // Prefer the smallest object literal (innermost) that contains the point.
    candidates.sort((a, b) => {
      const ra = a.getEnd() - a.getStart()
      const rb = b.getEnd() - b.getStart()
      return ra - rb
    })
  }

  if (candidates.length > 1 && !isPoint) {
    return { reasonCodes: [ReasonCodes.targetObjectAmbiguous] }
  }

  return { object: candidates[0] }
}

const insertBeforeTrailingWhitespace = (text: string, obj: ObjectLiteralExpression, closeBraceOffset: number): number => {
  let offset = closeBraceOffset
  while (offset > obj.getStart()) {
    const ch = text[offset - 1]
    if (ch !== ' ' && ch !== '\t') break
    offset -= 1
  }
  return offset
}

const indentValueCode = (valueCode: string, eol: string, baseIndent: string): string => {
  const lines = valueCode.split(/\r?\n/)
  if (lines.length <= 1) return valueCode
  return [lines[0] ?? '', ...lines.slice(1).map((line) => (line.length > 0 ? `${baseIndent}${line}` : line))].join(eol)
}

export type AddObjectPropertyEvaluation =
  | { readonly decision: 'write'; readonly reasonCodes: ReadonlyArray<string>; readonly updatedText: string }
  | { readonly decision: 'skip'; readonly reasonCodes: ReadonlyArray<string> }
  | { readonly decision: 'fail'; readonly reasonCodes: ReadonlyArray<string> }

export const evaluateAddObjectProperty = (args: {
  readonly repoFileAbs: string
  readonly fileText: string
  readonly targetSpan: Span
  readonly property: PropertyWrite
  readonly reasonCodes: ReadonlyArray<string>
}): AddObjectPropertyEvaluation => {
  const reasonCodesBase = args.reasonCodes.length > 0 ? [...args.reasonCodes] : []

  const target = findTargetObjectLiteral({
    fileText: args.fileText,
    filePathAbs: args.repoFileAbs,
    targetSpan: args.targetSpan,
  })

  if (!target.object) {
    return {
      decision: 'fail',
      reasonCodes: [...reasonCodesBase, ...(target.reasonCodes ?? [ReasonCodes.targetObjectNotFound])],
    }
  }

  const obj = target.object

  if (obj.getProperties().some((p) => Node.isSpreadAssignment(p))) {
    return {
      decision: 'fail',
      reasonCodes: [...reasonCodesBase, ReasonCodes.targetObjectHasSpread],
    }
  }

  const name = args.property.name.trim()
  const valueCodeRaw = args.property.valueCode.trim()

  if (name.length === 0 || valueCodeRaw.length === 0) {
    return {
      decision: 'fail',
      reasonCodes: [...reasonCodesBase, ReasonCodes.applyFailed],
    }
  }

  if (isObjectPropertyDeclared(obj, name)) {
    return {
      decision: 'skip',
      reasonCodes: [...reasonCodesBase, ReasonCodes.propertyAlreadyDeclared],
    }
  }

  const fileText = args.fileText
  const eol = detectEol(fileText)
  const valueCode = valueCodeRaw.replace(/\r?\n/g, eol)

  const objText = fileText.slice(obj.getStart(), obj.getEnd())
  const isMultiline = objText.includes('\n')
  const closeBraceOffset = Math.max(obj.getStart(), obj.getEnd() - 1)
  const hasTrailingComma = hasTrailingCommaBeforeCloseBrace(fileText, obj)

  const nameCode = propertyNameCode(name)

  if (!isMultiline && valueCode.includes(eol)) {
    return {
      decision: 'fail',
      reasonCodes: [...reasonCodesBase, ReasonCodes.applyFailed],
    }
  }

  if (isMultiline) {
    const props = obj.getProperties()
    const propertyIndent =
      props.length > 0 ? indentAtLine(fileText, props[0]!.getStart()) : `${indentAtLine(fileText, closeBraceOffset)}${fileText.includes('\t') ? '\t' : '  '}`

    const valueCodeIndented = indentValueCode(valueCode, eol, propertyIndent)
    const insertOffset = insertSpanForObjectLiteral(obj).start.offset
    const inserted = `${propertyIndent}${nameCode}: ${valueCodeIndented}${hasTrailingComma ? ',' : ''}${eol}`

    return {
      decision: 'write',
      reasonCodes: [...reasonCodesBase],
      updatedText: `${fileText.slice(0, insertOffset)}${inserted}${fileText.slice(insertOffset)}`,
    }
  }

  const insertOffset = insertBeforeTrailingWhitespace(fileText, obj, closeBraceOffset)
  const lastNonWsIdx = lastNonWhitespaceIndexBefore(fileText, obj.getStart(), insertOffset)
  const empty = lastNonWsIdx >= 0 && fileText[lastNonWsIdx] === '{'

  const prefix = empty ? ' ' : hasTrailingComma ? ' ' : ', '
  const suffix = empty ? ' ' : ''
  const trailingComma = hasTrailingComma ? ',' : ''

  const inserted = `${prefix}${nameCode}: ${valueCode}${trailingComma}${suffix}`

  return {
    decision: 'write',
    reasonCodes: [...reasonCodesBase],
    updatedText: `${fileText.slice(0, insertOffset)}${inserted}${fileText.slice(insertOffset)}`,
  }
}
