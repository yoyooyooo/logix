import { Node, type ObjectLiteralExpression } from 'ts-morph'

import { spanAtOffset, type Span } from './span.js'

export const insertSpanForObjectLiteral = (obj: ObjectLiteralExpression): Span => {
  const sourceFile = obj.getSourceFile()
  const fullText = sourceFile.getFullText()
  const closeBraceOffset = Math.max(obj.getStart(), obj.getEnd() - 1)

  // Prefer inserting at the line start of the closing `}` for multi-line objects,
  // so we don't end up inserting after the indentation whitespace.
  const objText = fullText.slice(obj.getStart(), obj.getEnd())
  if (objText.includes('\n')) {
    const lineStart = fullText.lastIndexOf('\n', closeBraceOffset)
    const insertOffset = lineStart >= 0 ? lineStart + 1 : closeBraceOffset
    return spanAtOffset(sourceFile, insertOffset)
  }

  // Single-line object literal: insert right before `}`.
  return spanAtOffset(sourceFile, closeBraceOffset)
}

export const isObjectPropertyDeclared = (obj: ObjectLiteralExpression, name: string): boolean =>
  obj.getProperties().some((p) => {
    if (!Node.isPropertyAssignment(p) && !Node.isShorthandPropertyAssignment(p) && !Node.isMethodDeclaration(p)) return false
    const nameNode = (p as any).getNameNode?.() as Node | undefined
    if (!nameNode) return false
    if (Node.isIdentifier(nameNode)) return nameNode.getText() === name
    if (Node.isStringLiteral(nameNode)) return nameNode.getLiteralValue() === name
    if (Node.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.getLiteralText() === name
    return false
  })
