import type { Node, SourceFile } from 'ts-morph'

export type Pos = { readonly line: number; readonly column: number; readonly offset: number }
export type Span = { readonly start: Pos; readonly end: Pos }

export const posAtOffset = (sourceFile: SourceFile, offset: number): Pos => {
  const lc = sourceFile.getLineAndColumnAtPos(offset)
  return { line: lc.line, column: lc.column, offset }
}

export const spanOfNode = (node: Node): Span => {
  const sourceFile = node.getSourceFile()
  const start = node.getStart()
  const end = node.getEnd()
  return { start: posAtOffset(sourceFile, start), end: posAtOffset(sourceFile, end) }
}

export const spanAtOffset = (sourceFile: SourceFile, offset: number): Span => ({
  start: posAtOffset(sourceFile, offset),
  end: posAtOffset(sourceFile, offset),
})
