#!/usr/bin/env tsx
/**
 * Print the TypeScript type of a symbol in a given file using ts-morph.
 *
 * Usage (from skill root):
 *   pnpm install           # once
 *   npx tsx scripts/inspect-types.ts <filePath> <symbolName> [--tsconfig path/to/tsconfig.json]
 *
 * Example (from project root):
 *   cd .agent/skills/ts-type-debug
 *   npx tsx scripts/inspect-types.ts ../../docs/specs/intent-driven-ai-coding/v3/effect-poc/scenarios/approval-flow.ts ApprovalLogic --tsconfig ../../tsconfig.json
 */

import { Project } from 'ts-morph'
import path from 'node:path'

function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: inspect-types <filePath> <symbolName> [--tsconfig path/to/tsconfig.json]')
    process.exit(1)
  }

  const filePathArg = args[0]
  const symbolName = args[1]
  const tsconfigFlagIndex = args.indexOf('--tsconfig')
  const tsconfigPath =
    tsconfigFlagIndex !== -1 && args[tsconfigFlagIndex + 1]
      ? args[tsconfigFlagIndex + 1]
      : 'tsconfig.json'

  const rootDir = process.cwd()
  const tsconfigFilePath = path.resolve(rootDir, tsconfigPath)
  const filePath = path.resolve(rootDir, filePathArg)

  const project = new Project({
    tsConfigFilePath: tsconfigFilePath,
  })

  const sourceFile = project.getSourceFile(filePath)
  if (!sourceFile) {
    console.error('Source file not found in project:', filePath)
    process.exit(1)
  }

  let found = false

  const logType = (typeText: string) => {
    console.log(`Type of ${symbolName}:`)
    console.log(typeText)
  }

  const varDecl = sourceFile.getVariableDeclaration(symbolName)
  if (varDecl) {
    found = true
    logType(varDecl.getType().getText())
  }

  if (!found) {
    const funcDecl = sourceFile.getFunction(symbolName)
    if (funcDecl) {
      found = true
      logType(funcDecl.getType().getText())
    }
  }

  if (!found) {
    const typeAlias = sourceFile.getTypeAlias(symbolName)
    if (typeAlias) {
      found = true
      logType(typeAlias.getType().getText())
    }
  }

  if (!found) {
    console.error(`Symbol ${symbolName} not found in ${filePath}`)
    process.exit(1)
  }
}

main()

