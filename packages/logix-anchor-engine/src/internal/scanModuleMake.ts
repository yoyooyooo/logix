import { Node, SyntaxKind, type SourceFile } from 'ts-morph'

import type { ModuleDefEntry, RawModeEntry } from './entries.js'
import { ReasonCodes } from './reasonCodes.js'
import { spanOfNode } from './span.js'
import { getStringLiteral, isLogixModuleMakeCall, normalizeFilePath } from './syntax.js'

export const scanModuleMake = (args: {
  readonly repoRootAbs: string
  readonly sourceFile: SourceFile
}): { readonly entries: ReadonlyArray<ModuleDefEntry>; readonly rawMode: ReadonlyArray<RawModeEntry> } => {
  const entries: ModuleDefEntry[] = []
  const rawMode: RawModeEntry[] = []

  const file = normalizeFilePath(args.repoRootAbs, args.sourceFile.getFilePath().toString())
  const calls = args.sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const call of calls) {
    if (!isLogixModuleMakeCall(call)) continue

    const span = spanOfNode(call)
    const [moduleIdArg, defArg] = call.getArguments()
    const moduleIdLiteral = moduleIdArg ? getStringLiteral(moduleIdArg) : undefined

    if (!moduleIdLiteral) {
      rawMode.push({
        file,
        span,
        reasonCodes: [ReasonCodes.moduleMakeNonLiteralModuleId],
      })
      continue
    }

    if (!defArg) {
      rawMode.push({
        file,
        span,
        reasonCodes: [ReasonCodes.moduleMakeMissingDef],
      })
      continue
    }

    if (!Node.isObjectLiteralExpression(defArg)) {
      rawMode.push({
        file,
        span,
        reasonCodes: [ReasonCodes.moduleMakeDefNotObjectLiteral],
      })
      continue
    }

    entries.push({
      entryKey: `module:${moduleIdLiteral}`,
      kind: 'ModuleDef',
      file,
      span,
      moduleIdLiteral,
    })
  }

  return { entries, rawMode }
}
