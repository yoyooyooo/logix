import { Node, SyntaxKind, type ObjectLiteralExpression, type SourceFile } from 'ts-morph'

import type { AutofillTargetEntry, Missing, RawModeEntry } from './entries.js'
import { insertSpanForObjectLiteral, isObjectPropertyDeclared } from './missingField.js'
import { ReasonCodes } from './reasonCodes.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, isLogixModuleMakeCall, normalizeFilePath } from './syntax.js'

const matchPropertyName = (prop: Node, name: string): boolean => {
  if (!Node.isPropertyAssignment(prop) && !Node.isShorthandPropertyAssignment(prop) && !Node.isMethodDeclaration(prop)) return false
  const nameNode = (prop as any).getNameNode?.() as Node | undefined
  if (!nameNode) return false
  if (Node.isIdentifier(nameNode)) return nameNode.getText() === name
  if (Node.isStringLiteral(nameNode)) return nameNode.getLiteralValue() === name
  if (Node.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.getLiteralText() === name
  return false
}

const findProperty = (obj: ObjectLiteralExpression, name: string): Node | undefined =>
  obj.getProperties().find((p) => matchPropertyName(p, name))

const findObjectLiteralProperty = (obj: ObjectLiteralExpression, name: string): ObjectLiteralExpression | undefined => {
  const prop = findProperty(obj, name)
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  return init && Node.isObjectLiteralExpression(init) ? init : undefined
}

export const scanMissingAnchors = (args: {
  readonly repoRootAbs: string
  readonly sourceFile: SourceFile
}): { readonly entries: ReadonlyArray<AutofillTargetEntry>; readonly rawMode: ReadonlyArray<RawModeEntry> } => {
  const entries: AutofillTargetEntry[] = []
  const rawMode: RawModeEntry[] = []

  const file = normalizeFilePath(args.repoRootAbs, args.sourceFile.getFilePath().toString())
  const calls = args.sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const call of calls) {
    if (!isLogixModuleMakeCall(call)) continue

    const [moduleIdArg, defArg] = call.getArguments()
    const moduleIdLiteral = moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
    if (!moduleIdLiteral) continue
    if (!defArg || !Node.isObjectLiteralExpression(defArg)) continue

    const missing: { services?: Missing['services']; devSource?: Missing['devSource'] } = {}

    if (!isObjectPropertyDeclared(defArg, 'services')) {
      missing.services = { field: 'services', insertSpan: insertSpanForObjectLiteral(defArg) }
    }

    const devObj = findObjectLiteralProperty(defArg, 'dev')
    if (!devObj) {
      // If `dev` exists but isn't an object literal, we can't safely patch nested `source`.
      const devProp = findProperty(defArg, 'dev')
      if (devProp) {
        rawMode.push({
          file,
          span: spanOfNode(devProp),
          reasonCodes: [ReasonCodes.moduleDevNotObjectLiteral],
        })
      } else {
        missing.devSource = { field: 'dev', insertSpan: insertSpanForObjectLiteral(defArg) }
      }
    } else if (!isObjectPropertyDeclared(devObj, 'source')) {
      missing.devSource = { field: 'source', insertSpan: insertSpanForObjectLiteral(devObj) }
    }

    if (missing.services || missing.devSource) {
      entries.push({
        entryKey: `autofillTarget:module:${moduleIdLiteral}`,
        kind: 'AutofillTarget',
        file,
        span: spanOfNode(call),
        target: { kind: 'module', moduleIdLiteral },
        missing: missing as Missing,
      })
    }
  }

  return { entries, rawMode }
}
