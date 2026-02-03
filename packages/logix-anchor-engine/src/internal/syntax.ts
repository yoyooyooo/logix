import path from 'node:path'
import { Node, type CallExpression } from 'ts-morph'

export const normalizeFilePath = (repoRootAbs: string, fileAbs: string): string =>
  path.relative(repoRootAbs, fileAbs).split(path.sep).join('/')

export const getStringLiteral = (node: Node): string | undefined => {
  if (Node.isStringLiteral(node)) return node.getLiteralValue()
  if (Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralText()
  return undefined
}

export const isLogixModuleMakeCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  if (expr.getName() !== 'make') return false

  const left = expr.getExpression()
  if (!Node.isPropertyAccessExpression(left)) return false
  if (left.getName() !== 'Module') return false

  const root = left.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix'
}

