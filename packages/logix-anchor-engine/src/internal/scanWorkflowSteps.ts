import { Node, SyntaxKind, type CallExpression, type ObjectLiteralExpression } from 'ts-morph'

import type { AutofillTargetEntry, RawModeEntry, WorkflowCallUseEntry } from './entries.js'
import { insertSpanForObjectLiteral, isObjectPropertyDeclared } from './missingField.js'
import { ReasonCodes } from './reasonCodes.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, normalizeFilePath } from './syntax.js'

const isWorkflowNamespace = (expr: Node): boolean => {
  if (Node.isIdentifier(expr)) return expr.getText() === 'Workflow'
  if (!Node.isPropertyAccessExpression(expr)) return false
  if (expr.getName() !== 'Workflow') return false
  const root = expr.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix'
}

const isWorkflowStepBuilderCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  const name = expr.getName()
  if (name !== 'dispatch' && name !== 'delay' && name !== 'callById') return false
  return isWorkflowNamespace(expr.getExpression())
}

const findObjectLiteralArg0 = (call: CallExpression): ObjectLiteralExpression | undefined => {
  const [first] = call.getArguments()
  return first && Node.isObjectLiteralExpression(first) ? first : undefined
}

const findStringLiteralProp = (obj: ObjectLiteralExpression, name: string): string | undefined => {
  const prop = obj
    .getProperties()
    .find((p) => Node.isPropertyAssignment(p) && p.getNameNode().getText().replace(/['"`]/g, '') === name)
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  return init ? getStringLiteral(init) : undefined
}

const findKeyPropNode = (obj: ObjectLiteralExpression): Node | undefined => {
  const prop = obj.getProperties().find((p) => Node.isPropertyAssignment(p) && p.getNameNode().getText().replace(/['"`]/g, '') === 'key')
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined
  return prop.getInitializer() ?? prop
}

export const scanWorkflowSteps = (args: {
  readonly repoRootAbs: string
  readonly workflowLocalIdLiteral: string
  readonly workflowCall: CallExpression
  readonly moduleIdLiteral?: string
}): {
  readonly callUses: ReadonlyArray<WorkflowCallUseEntry>
  readonly autofillTargets: ReadonlyArray<AutofillTargetEntry>
  readonly rawMode: ReadonlyArray<RawModeEntry>
  readonly duplicateStepKeys: ReadonlyArray<string>
} => {
  const callUses: WorkflowCallUseEntry[] = []
  const autofillTargets: AutofillTargetEntry[] = []
  const rawMode: RawModeEntry[] = []

  const file = normalizeFilePath(args.repoRootAbs, args.workflowCall.getSourceFile().getFilePath().toString())
  const workflowSpan = spanOfNode(args.workflowCall)

  const stepCalls = args.workflowCall.getDescendantsOfKind(SyntaxKind.CallExpression)
  const seenKeys = new Map<string, Node>()
  const duplicateKeys = new Set<string>()

  for (const call of stepCalls) {
    if (!isWorkflowStepBuilderCall(call)) continue

    const expr = call.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) continue
    const stepFn = expr.getName()

    const argsObj = findObjectLiteralArg0(call)
    if (!argsObj) {
      rawMode.push({
        file,
        span: spanOfNode(call),
        reasonCodes: [ReasonCodes.workflowStepArgsNotObjectLiteral],
      })
      continue
    }

    // key (stepKey)
    if (!isObjectPropertyDeclared(argsObj, 'key')) {
      autofillTargets.push({
        entryKey: `autofillTarget:workflow:${args.workflowLocalIdLiteral}:${spanOfNode(argsObj).start.offset}`,
        kind: 'AutofillTarget',
        file,
        span: workflowSpan,
        target: { kind: 'workflow', workflowLocalIdLiteral: args.workflowLocalIdLiteral },
        missing: {
          workflowStepKey: { field: 'key', insertSpan: insertSpanForObjectLiteral(argsObj) },
        },
      })
    } else {
      const key = findStringLiteralProp(argsObj, 'key')
      const keyNode = findKeyPropNode(argsObj)
      if (key && keyNode) {
        if (seenKeys.has(key)) {
          duplicateKeys.add(key)
          rawMode.push({
            file,
            span: spanOfNode(keyNode),
            reasonCodes: [ReasonCodes.workflowStepDuplicateStepKey],
          })
        } else {
          seenKeys.set(key, keyNode)
        }
      }
    }

    // callById(serviceId) → WorkflowCallUse
    if (stepFn === 'callById') {
      const serviceId = findStringLiteralProp(argsObj, 'serviceId')
      if (!serviceId) {
        rawMode.push({
          file,
          span: spanOfNode(call),
          reasonCodes: [ReasonCodes.workflowCallNonLiteralServiceId],
        })
        continue
      }

      callUses.push({
        entryKey: `workflowCallUse:${args.workflowLocalIdLiteral}:${serviceId}:${spanOfNode(call).start.offset}`,
        kind: 'WorkflowCallUse',
        file,
        span: spanOfNode(call),
        workflowLocalIdLiteral: args.workflowLocalIdLiteral,
        serviceIdLiteral: serviceId,
        ...(args.moduleIdLiteral ? { moduleIdLiteral: args.moduleIdLiteral } : null),
      })
    }
  }

  return {
    callUses,
    autofillTargets,
    rawMode,
    duplicateStepKeys: Array.from(duplicateKeys).sort(),
  }
}
