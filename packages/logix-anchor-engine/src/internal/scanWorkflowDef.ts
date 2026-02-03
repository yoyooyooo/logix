import { Node, SyntaxKind, type CallExpression, type Expression, type ObjectLiteralExpression, type SourceFile } from 'ts-morph'

import type { AutofillTargetEntry, RawModeEntry, WorkflowCallUseEntry, WorkflowDefEntry } from './entries.js'
import { ReasonCodes } from './reasonCodes.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, isLogixModuleMakeCall, normalizeFilePath } from './syntax.js'
import { scanWorkflowSteps } from './scanWorkflowSteps.js'

const isWorkflowDefCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false

  const name = expr.getName()
  if (name !== 'make' && name !== 'fromJSON') return false

  const left = expr.getExpression()
  if (Node.isIdentifier(left)) return left.getText() === 'Workflow'

  if (!Node.isPropertyAccessExpression(left)) return false
  if (left.getName() !== 'Workflow') return false
  const root = left.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix'
}

const findLocalIdLiteral = (def: ObjectLiteralExpression): string | undefined => {
  for (const prop of def.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue
    const nameNode = prop.getNameNode()
    if (!Node.isIdentifier(nameNode) && !Node.isStringLiteral(nameNode) && !Node.isNoSubstitutionTemplateLiteral(nameNode)) continue
    const name =
      Node.isIdentifier(nameNode) ? nameNode.getText() : Node.isStringLiteral(nameNode) ? nameNode.getLiteralValue() : nameNode.getLiteralText()
    if (name !== 'localId') continue
    const init = prop.getInitializer()
    return init ? getStringLiteral(init) : undefined
  }
  return undefined
}

const isWithWorkflowCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  const name = expr.getName()
  return name === 'withWorkflow' || name === 'withWorkflows'
}

const resolveModuleIdLiteralFromExpr = (expr: Expression): string | undefined => {
  if (Node.isCallExpression(expr) && isLogixModuleMakeCall(expr)) {
    const [moduleIdArg] = expr.getArguments()
    return moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
  }

  if (Node.isIdentifier(expr)) {
    const symbolAtNode = expr.getSymbol()
    const symbol = symbolAtNode?.getAliasedSymbol() ?? symbolAtNode
    const decl = symbol?.getValueDeclaration()
    if (!decl || !Node.isVariableDeclaration(decl)) return undefined
    const init = decl.getInitializer()
    if (!init || !Node.isCallExpression(init) || !isLogixModuleMakeCall(init)) return undefined
    const [moduleIdArg] = init.getArguments()
    return moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
  }

  const calls = expr.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) => isLogixModuleMakeCall(c))
  if (calls.length !== 1) return undefined
  const [moduleIdArg] = calls[0]!.getArguments()
  return moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
}

const resolveWorkflowLocalIdsFromExpr = (expr: Expression): ReadonlyArray<string> => {
  if (Node.isCallExpression(expr) && isWorkflowDefCall(expr)) {
    const [defArg] = expr.getArguments()
    if (!defArg || !Node.isObjectLiteralExpression(defArg)) return []
    const id = findLocalIdLiteral(defArg)
    return id ? [id] : []
  }

  if (Node.isIdentifier(expr)) {
    const symbolAtNode = expr.getSymbol()
    const symbol = symbolAtNode?.getAliasedSymbol() ?? symbolAtNode
    const decl = symbol?.getValueDeclaration()
    if (!decl || !Node.isVariableDeclaration(decl)) return []
    const init = decl.getInitializer()
    if (!init || !Node.isCallExpression(init) || !isWorkflowDefCall(init)) return []
    const [defArg] = init.getArguments()
    if (!defArg || !Node.isObjectLiteralExpression(defArg)) return []
    const id = findLocalIdLiteral(defArg)
    return id ? [id] : []
  }

  if (Node.isArrayLiteralExpression(expr)) {
    const ids: string[] = []
    for (const el of expr.getElements()) {
      if (!Node.isExpression(el)) continue
      ids.push(...resolveWorkflowLocalIdsFromExpr(el))
    }
    return ids
  }

  return []
}

export const scanWorkflowDef = (args: {
  readonly repoRootAbs: string
  readonly sourceFile: SourceFile
}): {
  readonly entries: ReadonlyArray<WorkflowDefEntry>
  readonly rawMode: ReadonlyArray<RawModeEntry>
  readonly callUses: ReadonlyArray<WorkflowCallUseEntry>
  readonly autofillTargets: ReadonlyArray<AutofillTargetEntry>
  readonly workflowRawMode: ReadonlyArray<RawModeEntry>
} => {
  const entries: WorkflowDefEntry[] = []
  const rawMode: RawModeEntry[] = []
  const callUses: WorkflowCallUseEntry[] = []
  const autofillTargets: AutofillTargetEntry[] = []
  const workflowRawMode: RawModeEntry[] = []

  const file = normalizeFilePath(args.repoRootAbs, args.sourceFile.getFilePath().toString())
  const calls = args.sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

  const workflowModuleIds = new Map<string, Set<string>>()
  for (const call of calls) {
    if (!isWithWorkflowCall(call)) continue

    const expr = call.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) continue
    const receiver = expr.getExpression()
    if (!Node.isExpression(receiver)) continue
    const moduleIdLiteral = resolveModuleIdLiteralFromExpr(receiver)
    if (!moduleIdLiteral) continue

    const [arg0] = call.getArguments()
    if (!arg0 || !Node.isExpression(arg0)) continue
    const workflowIds = resolveWorkflowLocalIdsFromExpr(arg0)
    for (const workflowLocalId of workflowIds) {
      const set = workflowModuleIds.get(workflowLocalId)
      if (set) set.add(moduleIdLiteral)
      else workflowModuleIds.set(workflowLocalId, new Set([moduleIdLiteral]))
    }
  }

  for (const call of calls) {
    if (!isWorkflowDefCall(call)) continue

    const span = spanOfNode(call)
    const [defArg] = call.getArguments()
    if (!defArg) {
      rawMode.push({ file, span, reasonCodes: [ReasonCodes.workflowMakeMissingDef] })
      continue
    }
    if (!Node.isObjectLiteralExpression(defArg)) {
      rawMode.push({ file, span, reasonCodes: [ReasonCodes.workflowMakeDefNotObjectLiteral] })
      continue
    }

    const localId = findLocalIdLiteral(defArg)
    if (!localId) {
      rawMode.push({ file, span, reasonCodes: [ReasonCodes.workflowDefMissingLocalId] })
      continue
    }

    const moduleCandidates = workflowModuleIds.get(localId)
    const moduleIdLiteral = moduleCandidates && moduleCandidates.size === 1 ? Array.from(moduleCandidates)[0] : undefined

    const scanned = scanWorkflowSteps({
      repoRootAbs: args.repoRootAbs,
      workflowLocalIdLiteral: localId,
      workflowCall: call,
      ...(moduleIdLiteral ? { moduleIdLiteral } : null),
    })

    entries.push({
      entryKey: `workflow:${localId}`,
      kind: 'WorkflowDef',
      file,
      span,
      workflowLocalIdLiteral: localId,
      ...(moduleIdLiteral ? { moduleIdLiteral } : null),
      ...(scanned.duplicateStepKeys.length > 0 ? { reasonCodes: [ReasonCodes.workflowDefDuplicateStepKey] } : null),
    })

    callUses.push(...scanned.callUses)
    autofillTargets.push(...scanned.autofillTargets)
    workflowRawMode.push(...scanned.rawMode)
  }

  return {
    entries,
    rawMode,
    callUses,
    autofillTargets,
    workflowRawMode,
  }
}
