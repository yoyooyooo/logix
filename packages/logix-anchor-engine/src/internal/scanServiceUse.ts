import { Node, SyntaxKind, type CallExpression, type Expression, type SourceFile } from 'ts-morph'

import type { RawModeEntry, ServiceUseEntry } from './entries.js'
import { ReasonCodes } from './reasonCodes.js'
import { resolveServiceIdLiteralFromTagExpr } from './resolveServiceId.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, isLogixModuleMakeCall, normalizeFilePath } from './syntax.js'

const isDollarUseCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  if (expr.getName() !== 'use') return false
  const target = expr.getExpression()
  return Node.isIdentifier(target) && target.getText() === '$'
}

const resolveModuleIdFromLogicOwner = (owner: Node): string | undefined => {
  // Support: `SomeModuleDef.logic(...)` where `SomeModuleDef` was declared as `Logix.Module.make('<id>', {...})`.
  if (!Node.isIdentifier(owner)) return undefined
  const symbolAtNode = owner.getSymbol()
  const symbol = symbolAtNode?.getAliasedSymbol() ?? symbolAtNode
  const decl = symbol?.getValueDeclaration()
  if (!decl || !Node.isVariableDeclaration(decl)) return undefined
  const init = decl.getInitializer()
  if (!init || !Node.isCallExpression(init) || !isLogixModuleMakeCall(init)) return undefined
  const [moduleIdArg] = init.getArguments()
  return moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
}

const findEnclosingLogicOwner = (node: Node): Node | undefined => {
  let current: Node | undefined = node
  while (current) {
    if (Node.isCallExpression(current)) {
      const expr = current.getExpression()
      if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'logic') {
        return expr.getExpression()
      }
    }
    current = current.getParent()
  }
  return undefined
}

export const scanServiceUse = (args: {
  readonly repoRootAbs: string
  readonly sourceFile: SourceFile
}): { readonly entries: ReadonlyArray<ServiceUseEntry>; readonly rawMode: ReadonlyArray<RawModeEntry> } => {
  const entries: ServiceUseEntry[] = []
  const rawMode: RawModeEntry[] = []

  const file = normalizeFilePath(args.repoRootAbs, args.sourceFile.getFilePath().toString())
  const calls = args.sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const call of calls) {
    if (!isDollarUseCall(call)) continue
    const span = spanOfNode(call)
    const [firstArg] = call.getArguments()
    if (!firstArg) {
      rawMode.push({
        file,
        span,
        reasonCodes: [ReasonCodes.serviceUseMissingArg],
      })
      continue
    }

    if (!Node.isExpression(firstArg)) {
      rawMode.push({
        file,
        span,
        reasonCodes: [ReasonCodes.serviceUseMissingArg],
      })
      continue
    }

    const resolved = resolveServiceIdLiteralFromTagExpr({
      repoRootAbs: args.repoRootAbs,
      tagExpr: firstArg as Expression,
    })
    if (!resolved.ok) {
      rawMode.push({
        file,
        span,
        reasonCodes: resolved.reasonCodes,
      })
      continue
    }

    const logicOwner = findEnclosingLogicOwner(call)
    const moduleIdLiteral = logicOwner ? resolveModuleIdFromLogicOwner(logicOwner) : undefined

    entries.push({
      entryKey: `serviceUse:${resolved.serviceIdLiteral}:${span.start.offset}`,
      kind: 'ServiceUse',
      file,
      span,
      ...(moduleIdLiteral ? { moduleIdLiteral } : null),
      tagSymbol: resolved.tagSymbol,
      serviceIdLiteral: resolved.serviceIdLiteral,
    })
  }

  return { entries, rawMode }
}
