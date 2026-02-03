import { Node, SyntaxKind, type Expression, type Node as TsNode } from 'ts-morph'

import type { TagSymbol } from './entries.js'
import { ReasonCodes } from './reasonCodes.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, normalizeFilePath } from './syntax.js'

type ResolveResult =
  | { readonly ok: true; readonly tagSymbol: TagSymbol; readonly serviceIdLiteral: string; readonly reasonCodes?: ReadonlyArray<string> }
  | { readonly ok: false; readonly tagSymbol: TagSymbol; readonly reasonCodes: ReadonlyArray<string> }

const findContextTagKeyLiteral = (node: TsNode): string | undefined => {
  const calls = node.getDescendantsOfKind(SyntaxKind.CallExpression)
  for (const call of calls) {
    const expr = call.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) continue
    if (expr.getName() !== 'Tag') continue
    const left = expr.getExpression()
    if (!Node.isIdentifier(left) || left.getText() !== 'Context') continue
    const [first] = call.getArguments()
    if (!first) continue
    const lit = getStringLiteral(first)
    if (lit) return lit
  }
  return undefined
}

export const resolveServiceIdLiteralFromTagExpr = (args: {
  readonly repoRootAbs: string
  readonly tagExpr: Expression
}): ResolveResult => {
  const symbolAtNode = args.tagExpr.getSymbol()
  const symbol = symbolAtNode?.getAliasedSymbol() ?? symbolAtNode

  const name = symbol?.getName() ?? args.tagExpr.getText()
  const decl = symbol?.getDeclarations()[0]

  const tagSymbol: TagSymbol = {
    name,
    ...(decl
      ? {
          declFile: normalizeFilePath(args.repoRootAbs, decl.getSourceFile().getFilePath().toString()),
          declSpan: spanOfNode(decl),
        }
      : null),
  }

  if (!symbol) {
    return { ok: false, tagSymbol, reasonCodes: [ReasonCodes.serviceUseUnresolvedSymbol] }
  }

  const ids = new Set<string>()
  for (const d of symbol.getDeclarations()) {
    const lit = findContextTagKeyLiteral(d)
    if (lit) ids.add(lit)
  }

  if (ids.size === 0) {
    return { ok: false, tagSymbol, reasonCodes: [ReasonCodes.serviceUseUnresolvableServiceId] }
  }

  if (ids.size > 1) {
    return { ok: false, tagSymbol, reasonCodes: [ReasonCodes.serviceUseAmbiguousServiceId] }
  }

  return { ok: true, tagSymbol, serviceIdLiteral: Array.from(ids)[0]! }
}

