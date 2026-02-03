import { Effect } from 'effect'
import * as AnchorEngine from '@logixjs/anchor-engine'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  Node,
  Project,
  SyntaxKind,
  type CallExpression,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from 'ts-morph'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { readJsonInput } from '../output.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

const trySync = <A>(thunk: () => A): Effect.Effect<A, unknown> =>
  Effect.try({
    try: thunk,
    catch: (cause) => cause,
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

type DeltaEnsureWorkflowStepKeys = {
  readonly op: 'ensureWorkflowStepKeys'
  readonly workflowLocalId: string
  readonly strategy?: string
}

type DeltaAddState = {
  readonly op: 'addState'
  readonly key: string
  readonly type: string
  readonly initialCode: string
}

type DeltaAddAction = {
  readonly op: 'addAction'
  readonly actionTag: string
  readonly payloadType: string
}

type DeltaUnsupportedOp = { readonly op: string; readonly [k: string]: unknown }

type ModuleTransformDeltaV1 = {
  readonly schemaVersion: 1
  readonly kind: 'ModuleTransformDelta'
  readonly target: { readonly moduleFile: string; readonly exportName: string }
  readonly ops: ReadonlyArray<DeltaEnsureWorkflowStepKeys | DeltaAddState | DeltaAddAction | DeltaUnsupportedOp>
}

type Pos = { readonly line: number; readonly column: number; readonly offset: number }
type Span = { readonly start: Pos; readonly end: Pos }

type PatchOpInput = {
  readonly kind: 'AddObjectProperty'
  readonly file: string
  readonly targetSpan: Span
  readonly property: { readonly name: string; readonly valueCode: string }
  readonly reasonCodes?: ReadonlyArray<string>
}

type TransformReason = { readonly code: string; readonly message: string; readonly details?: unknown }

type TransformOpResult =
  | {
      readonly index: number
      readonly op: DeltaEnsureWorkflowStepKeys
      readonly status: 'planned' | 'written' | 'noop'
      readonly plannedOperations: number
    }
  | {
      readonly index: number
      readonly op: DeltaEnsureWorkflowStepKeys
      readonly status: 'skipped'
      readonly reason: TransformReason
    }
  | {
      readonly index: number
      readonly op: DeltaAddState | DeltaAddAction
      readonly status: 'planned' | 'written' | 'noop'
      readonly plannedOperations: number
    }
  | {
      readonly index: number
      readonly op: DeltaAddState | DeltaAddAction
      readonly status: 'skipped'
      readonly reason: TransformReason
    }
  | {
      readonly index: number
      readonly op: DeltaUnsupportedOp
      readonly status: 'skipped'
      readonly reason: { readonly code: 'unsupported_op'; readonly message: string }
    }

type TransformReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'TransformReport'
  readonly mode: 'report' | 'write'
  readonly runId: string
  readonly ok: boolean
  readonly input: { readonly repoRoot: string; readonly opsFile: string }
  readonly summary: {
    readonly opsTotal: number
    readonly plannedOperations: number
    readonly skippedOps: number
  }
  readonly results: ReadonlyArray<TransformOpResult>
}

const parseDelta = (value: unknown): ModuleTransformDeltaV1 => {
  if (!isRecord(value)) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] delta.json 必须是对象' })
  }
  if (value.schemaVersion !== 1) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] delta.json schemaVersion 非法：${String(value.schemaVersion)}` })
  }
  if (value.kind !== 'ModuleTransformDelta') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] delta.json kind 非法：${String(value.kind)}` })
  }
  const target = value.target
  if (!isRecord(target) || typeof target.moduleFile !== 'string' || typeof target.exportName !== 'string') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] delta.json target 非法（期望 {moduleFile, exportName}）' })
  }
  const ops = value.ops
  if (!Array.isArray(ops)) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] delta.json ops 非法（期望数组）' })
  }

  const parseOp = (raw: unknown): ModuleTransformDeltaV1['ops'][number] => {
    if (!isRecord(raw) || typeof raw.op !== 'string') {
      throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] delta.json ops[*] 非法（期望 { op: string, ... }）' })
    }
    switch (raw.op) {
      case 'ensureWorkflowStepKeys': {
        if (typeof raw.workflowLocalId !== 'string' || raw.workflowLocalId.length === 0) {
          throw makeCliError({
            code: 'CLI_INVALID_INPUT',
            message: '[Logix][CLI] ensureWorkflowStepKeys.workflowLocalId 非法（期望非空字符串）',
          })
        }
        const strategy = typeof raw.strategy === 'string' && raw.strategy.length > 0 ? raw.strategy : undefined
        return { op: 'ensureWorkflowStepKeys', workflowLocalId: raw.workflowLocalId, ...(strategy ? { strategy } : null) }
      }
      case 'addState': {
        if (typeof raw.key !== 'string' || raw.key.length === 0) {
          throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] addState.key 非法（期望非空字符串）' })
        }
        if (typeof raw.type !== 'string' || raw.type.length === 0) {
          throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] addState.type 非法（期望非空字符串）' })
        }
        if (typeof raw.initialCode !== 'string' || raw.initialCode.length === 0) {
          throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] addState.initialCode 非法（期望非空字符串）' })
        }
        return { op: 'addState', key: raw.key, type: raw.type, initialCode: raw.initialCode }
      }
      case 'addAction': {
        if (typeof raw.actionTag !== 'string' || raw.actionTag.length === 0) {
          throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] addAction.actionTag 非法（期望非空字符串）' })
        }
        if (typeof raw.payloadType !== 'string' || raw.payloadType.length === 0) {
          throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] addAction.payloadType 非法（期望非空字符串）' })
        }
        return { op: 'addAction', actionTag: raw.actionTag, payloadType: raw.payloadType }
      }
      default:
        return raw as DeltaUnsupportedOp
    }
  }

  return {
    schemaVersion: 1,
    kind: 'ModuleTransformDelta',
    target: { moduleFile: target.moduleFile, exportName: target.exportName },
    ops: ops.map(parseOp),
  }
}

const parseMeta = (reasonCodes: ReadonlyArray<string>): { readonly targetId?: string; readonly anchorKind?: string } => {
  let targetId: string | undefined
  let anchorKind: string | undefined
  for (const c of reasonCodes) {
    if (typeof c !== 'string') continue
    if (c.startsWith('autofill.target=')) targetId = c.slice('autofill.target='.length)
    if (c.startsWith('autofill.anchor=')) anchorKind = c.slice('autofill.anchor='.length)
  }
  return { targetId, anchorKind }
}

const getStringLiteral = (node: Node): string | undefined => {
  if (Node.isStringLiteral(node)) return node.getLiteralValue()
  if (Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralText()
  return undefined
}

const isLogixModuleMakeCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  if (expr.getName() !== 'make') return false

  const left = expr.getExpression()
  if (!Node.isPropertyAccessExpression(left)) return false
  if (left.getName() !== 'Module') return false

  const root = left.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix'
}

const posAtOffset = (sourceFile: SourceFile, offset: number): Pos => {
  const lc = sourceFile.getLineAndColumnAtPos(offset)
  return { line: lc.line, column: lc.column, offset }
}

const spanAtOffset = (sourceFile: SourceFile, offset: number): Span => ({
  start: posAtOffset(sourceFile, offset),
  end: posAtOffset(sourceFile, offset),
})

const insertSpanForObjectLiteral = (obj: ObjectLiteralExpression): Span => {
  const sourceFile = obj.getSourceFile()
  const fullText = sourceFile.getFullText()
  const closeBraceOffset = Math.max(obj.getStart(), obj.getEnd() - 1)

  const objText = fullText.slice(obj.getStart(), obj.getEnd())
  if (objText.includes('\n')) {
    const lineStart = fullText.lastIndexOf('\n', closeBraceOffset)
    const insertOffset = lineStart >= 0 ? lineStart + 1 : closeBraceOffset
    return spanAtOffset(sourceFile, insertOffset)
  }

  return spanAtOffset(sourceFile, closeBraceOffset)
}

const isObjectPropertyDeclared = (obj: ObjectLiteralExpression, name: string): boolean =>
  obj.getProperties().some((p) => {
    if (!Node.isPropertyAssignment(p) && !Node.isShorthandPropertyAssignment(p) && !Node.isMethodDeclaration(p)) return false
    const nameNode = (p as any).getNameNode?.() as Node | undefined
    if (!nameNode) return false
    if (Node.isIdentifier(nameNode)) return nameNode.getText() === name
    if (Node.isStringLiteral(nameNode)) return nameNode.getLiteralValue() === name
    if (Node.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.getLiteralText() === name
    return false
  })

const getPropertyInitializer = (obj: ObjectLiteralExpression, name: string): Node | undefined => {
  for (const p of obj.getProperties()) {
    if (!Node.isPropertyAssignment(p)) continue
    const nameNode = p.getNameNode()
    const key = getStringLiteral(nameNode) ?? (Node.isIdentifier(nameNode) ? nameNode.getText() : undefined)
    if (key === name) return p.getInitializer()
  }
  return undefined
}

const resolveIdentifier = (sourceFile: SourceFile, id: string): Node | undefined =>
  sourceFile.getVariableDeclaration(id)?.getInitializer()

const resolveObjectLiteral = (sourceFile: SourceFile, expr: Node | undefined): ObjectLiteralExpression | undefined => {
  if (!expr) return undefined
  if (Node.isObjectLiteralExpression(expr)) return expr
  if (Node.isIdentifier(expr)) {
    const init = resolveIdentifier(sourceFile, expr.getText())
    return init && Node.isObjectLiteralExpression(init) ? init : undefined
  }
  return undefined
}

const isSchemaStructCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  if (expr.getName() !== 'Struct') return false
  const left = expr.getExpression()
  return Node.isIdentifier(left) && left.getText() === 'Schema'
}

const resolveSchemaStructFieldsObject = (sourceFile: SourceFile, expr: Node | undefined): ObjectLiteralExpression | undefined => {
  if (!expr) return undefined
  if (Node.isCallExpression(expr) && isSchemaStructCall(expr)) {
    const first = expr.getArguments()[0]
    return first && Node.isObjectLiteralExpression(first) ? first : undefined
  }
  if (Node.isIdentifier(expr)) {
    const init = resolveIdentifier(sourceFile, expr.getText())
    return resolveSchemaStructFieldsObject(sourceFile, init)
  }
  return undefined
}

const isValidExprCode = (code: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(code)

const schemaValueCodeFromType = (
  sourceFile: SourceFile,
  raw: string,
): { readonly ok: true; readonly valueCode: string } | { readonly ok: false; readonly reason: TransformReason } => {
  const t = raw.trim()
  if (t.length === 0) {
    return { ok: false, reason: { code: 'invalid_type', message: '[Logix][CLI] type/payloadType 不能为空' } }
  }

  const hasSchema = sourceFile
    .getImportDeclarations()
    .some((d) => d.getNamedImports().some((n) => n.getName() === 'Schema') || d.getNamespaceImport()?.getText() === 'Schema')

  const lower = t.toLowerCase()
  const mapped =
    lower === 'unknown'
      ? 'Schema.Unknown'
      : lower === 'never'
        ? 'Schema.Never'
        : lower === 'void'
          ? 'Schema.Void'
          : lower === 'string'
            ? 'Schema.String'
            : lower === 'number'
              ? 'Schema.Number'
              : lower === 'boolean'
                ? 'Schema.Boolean'
                : lower === 'bigint'
                  ? 'Schema.BigInt'
                  : undefined

  if (mapped) {
    if (!hasSchema) {
      return {
        ok: false,
        reason: { code: 'missing_schema_import', message: '[Logix][CLI] 目标文件未导入 Schema，无法写入 Schema.* 值' },
      }
    }
    return { ok: true, valueCode: mapped }
  }

  if (!isValidExprCode(t)) {
    return {
      ok: false,
      reason: {
        code: 'invalid_type_code',
        message: '[Logix][CLI] type/payloadType 仅支持 primitives 或标识符/点路径表达式（禁止换行/分号/调用）',
        details: { got: raw },
      },
    }
  }

  return { ok: true, valueCode: t }
}

const isMultilineObjectLiteral = (obj: ObjectLiteralExpression): boolean => obj.getSourceFile().getFullText().slice(obj.getStart(), obj.getEnd()).includes('\n')

const validateValueCodeAgainstObject = (
  obj: ObjectLiteralExpression,
  valueCode: string,
): { readonly ok: true } | { readonly ok: false; readonly reason: TransformReason } => {
  const multiline = isMultilineObjectLiteral(obj)
  if (!multiline && /[\r\n]/.test(valueCode)) {
    return {
      ok: false,
      reason: { code: 'value_multiline_not_allowed', message: '[Logix][CLI] 目标是单行对象字面量，不允许写入多行 valueCode' },
    }
  }
  if (obj.getProperties().some((p) => Node.isSpreadAssignment(p))) {
    return {
      ok: false,
      reason: { code: 'target_has_spread', message: '[Logix][CLI] 目标对象包含 spread（{ ...x }），工具拒绝改写' },
    }
  }
  return { ok: true }
}

type TransformModuleInvocation = Extract<CliInvocation, { readonly command: 'transform.module' }>

export const runTransformModule = (inv: TransformModuleInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId
  const mode = inv.global.mode ?? 'report'

  return Effect.gen(function* () {
    const tsconfig = inv.global.tsconfig

    const raw = yield* readJsonInput(inv.opsPath, { stdin: process.stdin, label: '--ops' })
    const delta = yield* trySync(() => parseDelta(raw))

    const ensureOps = delta.ops
      .map((op, index) => ({ op, index }))
      .filter((x): x is { readonly op: DeltaEnsureWorkflowStepKeys; readonly index: number } => (x.op as any)?.op === 'ensureWorkflowStepKeys')

    const addStateOps = delta.ops
      .map((op, index) => ({ op, index }))
      .filter((x): x is { readonly op: DeltaAddState; readonly index: number } => (x.op as any)?.op === 'addState')

    const addActionOps = delta.ops
      .map((op, index) => ({ op, index }))
      .filter((x): x is { readonly op: DeltaAddAction; readonly index: number } => (x.op as any)?.op === 'addAction')

    const results: TransformOpResult[] = []
    const workflowIds = new Set<string>()
    for (const { op } of ensureOps) workflowIds.add(`workflow:${op.workflowLocalId}`)

    const unsupported = delta.ops
      .map((op, index) => ({ op, index }))
      .filter((x) => !['ensureWorkflowStepKeys', 'addState', 'addAction'].includes(String((x.op as any)?.op)))

    for (const { op, index } of unsupported) {
      results.push({
        index,
        op: op as DeltaUnsupportedOp,
        status: 'skipped',
        reason: { code: 'unsupported_op', message: `[Logix][CLI] transform module: 暂不支持 op=${String((op as any)?.op)}` },
      })
    }

    const moduleFileRel = delta.target.moduleFile.split('\\').join('/')
    const moduleFileAbs = path.isAbsolute(moduleFileRel) ? moduleFileRel : path.join(inv.repoRoot, moduleFileRel)
    const moduleSource = yield* Effect.either(
      Effect.tryPromise({
        try: async () => await fs.readFile(moduleFileAbs, 'utf8'),
        catch: (cause) => cause,
      }),
    )

    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(moduleFileAbs, moduleSource._tag === 'Right' ? moduleSource.right : '', { overwrite: true })

    const findModuleMake = (): { readonly moduleIdLiteral?: string; readonly defObject?: ObjectLiteralExpression } => {
      const decls = sourceFile.getExportedDeclarations().get(delta.target.exportName) ?? []
      const varDecl = decls.find((d): d is VariableDeclaration => Node.isVariableDeclaration(d))
      const init = varDecl?.getInitializer()
      if (!init || !Node.isCallExpression(init) || !isLogixModuleMakeCall(init)) return {}
      const [moduleIdArg, defArg] = init.getArguments()
      const moduleIdLiteral = moduleIdArg ? getStringLiteral(moduleIdArg) : undefined
      if (!moduleIdLiteral) return {}
      if (!defArg || !Node.isObjectLiteralExpression(defArg)) return {}
      return { moduleIdLiteral, defObject: defArg }
    }

    const moduleMake: { readonly moduleIdLiteral?: string; readonly defObject?: ObjectLiteralExpression } =
      moduleSource._tag === 'Right' ? findModuleMake() : {}

    const findImplementInitial = (): ObjectLiteralExpression | undefined => {
      const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
      const candidates = calls.filter((c) => {
        const expr = c.getExpression()
        return (
          Node.isPropertyAccessExpression(expr) &&
          expr.getName() === 'implement' &&
          Node.isIdentifier(expr.getExpression()) &&
          expr.getExpression().getText() === delta.target.exportName
        )
      })

      if (candidates.length !== 1) return undefined
      const call = candidates[0]!
      const arg0 = call.getArguments()[0]
      if (!arg0 || !Node.isObjectLiteralExpression(arg0)) return undefined
      const initExpr = getPropertyInitializer(arg0, 'initial')
      return resolveObjectLiteral(sourceFile, initExpr)
    }

    const initialObj = moduleSource._tag === 'Right' ? findImplementInitial() : undefined

    const stateSchemaFieldsObj =
      moduleSource._tag === 'Right' && moduleMake.defObject ? resolveSchemaStructFieldsObject(sourceFile, getPropertyInitializer(moduleMake.defObject, 'state')) : undefined

    const actionsObj =
      moduleSource._tag === 'Right' && moduleMake.defObject ? resolveObjectLiteral(sourceFile, getPropertyInitializer(moduleMake.defObject, 'actions')) : undefined

    const moduleTargetMissingReason: TransformReason | undefined =
      moduleSource._tag === 'Left'
        ? { code: 'target_file_not_found', message: '[Logix][CLI] target.moduleFile 不存在或不可读', details: { moduleFile: moduleFileRel } }
        : !moduleMake.defObject
          ? { code: 'target_not_module_def', message: '[Logix][CLI] target.exportName 未解析为 Logix.Module.make(...)（Platform-Grade 子集要求）' }
          : undefined

    const addStateOpsPlanned: Array<{ readonly index: number; readonly op: DeltaAddState; readonly planned: number }> = []
    const addActionOpsPlanned: Array<{ readonly index: number; readonly op: DeltaAddAction; readonly planned: number }> = []

    for (const { op, index } of addActionOps) {
      if (moduleTargetMissingReason) {
        results.push({ index, op, status: 'skipped', reason: moduleTargetMissingReason })
        continue
      }
      if (!actionsObj) {
        results.push({
          index,
          op,
          status: 'skipped',
          reason: { code: 'actions_not_object_literal', message: '[Logix][CLI] ModuleDef.actions 未解析为对象字面量（或同文件 const 引用）' },
        })
        continue
      }
      const built = schemaValueCodeFromType(sourceFile, op.payloadType)
      if (!built.ok) {
        results.push({ index, op, status: 'skipped', reason: built.reason })
        continue
      }
      if (isObjectPropertyDeclared(actionsObj, op.actionTag)) {
        results.push({ index, op, status: 'noop', plannedOperations: 0 })
        continue
      }
      const validate = validateValueCodeAgainstObject(actionsObj, built.valueCode)
      if (!validate.ok) {
        results.push({ index, op, status: 'skipped', reason: validate.reason })
        continue
      }

      addActionOpsPlanned.push({ index, op, planned: 1 })
    }

    for (const { op, index } of addStateOps) {
      if (moduleTargetMissingReason) {
        results.push({ index, op, status: 'skipped', reason: moduleTargetMissingReason })
        continue
      }
      if (!stateSchemaFieldsObj) {
        results.push({
          index,
          op,
          status: 'skipped',
          reason: { code: 'state_schema_not_struct_literal', message: '[Logix][CLI] ModuleDef.state 未解析为 Schema.Struct({ ... })（或同文件 const 引用）' },
        })
        continue
      }
      if (!initialObj) {
        results.push({
          index,
          op,
          status: 'skipped',
          reason: { code: 'initial_not_object_literal', message: '[Logix][CLI] 未找到唯一的 <Def>.implement({ initial: { ... } }) 初始状态对象字面量' },
        })
        continue
      }

      const builtSchema = schemaValueCodeFromType(sourceFile, op.type)
      if (!builtSchema.ok) {
        results.push({ index, op, status: 'skipped', reason: builtSchema.reason })
        continue
      }

      const schemaNeeds = !isObjectPropertyDeclared(stateSchemaFieldsObj, op.key)
      const initialNeeds = !isObjectPropertyDeclared(initialObj, op.key)
      const initialCode = op.initialCode.trim()
      if (initialCode.length === 0) {
        results.push({ index, op, status: 'skipped', reason: { code: 'invalid_initial_code', message: '[Logix][CLI] addState.initialCode 不能为空' } })
        continue
      }

      const validateSchema = schemaNeeds ? validateValueCodeAgainstObject(stateSchemaFieldsObj, builtSchema.valueCode) : { ok: true as const }
      if (!validateSchema.ok) {
        results.push({ index, op, status: 'skipped', reason: validateSchema.reason })
        continue
      }

      const validateInitial = initialNeeds ? validateValueCodeAgainstObject(initialObj, initialCode) : { ok: true as const }
      if (!validateInitial.ok) {
        results.push({ index, op, status: 'skipped', reason: validateInitial.reason })
        continue
      }

      const planned = (schemaNeeds ? 1 : 0) + (initialNeeds ? 1 : 0)
      if (planned === 0) {
        results.push({ index, op, status: 'noop', plannedOperations: 0 })
        continue
      }

      addStateOpsPlanned.push({ index, op, planned })
    }

    const index = yield* AnchorEngine.Parser.buildAnchorIndex({
      repoRoot: inv.repoRoot,
      ...(tsconfig ? { tsconfig } : null),
    })

    const autofill = yield* AnchorEngine.Autofill.autofillAnchors({
      repoRoot: inv.repoRoot,
      mode: 'report',
      runId,
      anchorIndex: index,
    })

    const selectedOps = autofill.patchPlan.operations
      .filter((o) => o.kind === 'AddObjectProperty' && o.decision === 'write')
      .filter((o) => {
        const meta = parseMeta(o.reasonCodes)
        return meta.anchorKind === 'workflow.stepKey' && meta.targetId && workflowIds.has(meta.targetId)
      })
      .map((o) => ({
        kind: 'AddObjectProperty' as const,
        file: o.file,
        targetSpan: o.targetSpan,
        property: o.property,
        reasonCodes: o.reasonCodes,
      }))

    const plan = yield* AnchorEngine.Rewriter.buildPatchPlan({
      repoRoot: inv.repoRoot,
      mode,
      operations: [
        ...selectedOps,
        ...(moduleTargetMissingReason
          ? []
          : [
              ...addActionOpsPlanned.flatMap(({ op }) => {
                if (!actionsObj) return []
                const built = schemaValueCodeFromType(sourceFile, op.payloadType)
                if (!built.ok) return []
                const input: PatchOpInput = {
                    kind: 'AddObjectProperty' as const,
                    file: moduleFileRel,
                    targetSpan: insertSpanForObjectLiteral(actionsObj),
                    property: { name: op.actionTag, valueCode: built.valueCode },
                    reasonCodes: [`transform.op=addAction`, ...(moduleMake.moduleIdLiteral ? [`transform.target=module:${moduleMake.moduleIdLiteral}`] : [])],
                  }
                return [input]
              }),
              ...addStateOpsPlanned.flatMap(({ op }) => {
                if (!stateSchemaFieldsObj || !initialObj) return []
                const built = schemaValueCodeFromType(sourceFile, op.type)
                if (!built.ok) return []
                const opsOut: PatchOpInput[] = []
                if (!isObjectPropertyDeclared(stateSchemaFieldsObj, op.key)) {
                  opsOut.push({
                    kind: 'AddObjectProperty' as const,
                    file: moduleFileRel,
                    targetSpan: insertSpanForObjectLiteral(stateSchemaFieldsObj),
                    property: { name: op.key, valueCode: built.valueCode },
                    reasonCodes: [`transform.op=addState.schema`, ...(moduleMake.moduleIdLiteral ? [`transform.target=module:${moduleMake.moduleIdLiteral}`] : [])],
                  })
                }
                if (!isObjectPropertyDeclared(initialObj, op.key)) {
                  opsOut.push({
                    kind: 'AddObjectProperty' as const,
                    file: moduleFileRel,
                    targetSpan: insertSpanForObjectLiteral(initialObj),
                    property: { name: op.key, valueCode: op.initialCode.trim() },
                    reasonCodes: [`transform.op=addState.initial`, ...(moduleMake.moduleIdLiteral ? [`transform.target=module:${moduleMake.moduleIdLiteral}`] : [])],
                  })
                }
                return opsOut
              }),
            ]),
      ],
    })

    const writeBackResult =
      mode === 'write'
        ? yield* AnchorEngine.Rewriter.applyPatchPlan({
            repoRoot: inv.repoRoot,
            plan,
          })
        : undefined

    for (const { op, index: idx } of ensureOps) {
      const targetId = `workflow:${op.workflowLocalId}`
      const decision = autofill.report.changes
        .flatMap((c) => c.decisions.map((d) => ({ change: c, decision: d })))
        .filter((x) => x.change.moduleId === targetId && x.decision.kind === 'workflow.stepKey')[0]?.decision as any

      const plannedOperations = selectedOps.filter((o) => parseMeta(o.reasonCodes).targetId === targetId).length

      if (!decision) {
        results.push({
          index: idx,
          op,
          status: 'noop',
          plannedOperations: 0,
        })
        continue
      }

      if (decision.status === 'skipped') {
        results.push({
          index: idx,
          op,
          status: 'skipped',
          reason: decision.reason,
        })
        continue
      }

      results.push({
        index: idx,
        op,
        status: mode === 'write' ? 'written' : 'planned',
        plannedOperations,
      })
    }

    for (const { op, index, planned } of addActionOpsPlanned) {
      results.push({
        index,
        op,
        status: mode === 'write' ? 'written' : 'planned',
        plannedOperations: planned,
      })
    }

    for (const { op, index, planned } of addStateOpsPlanned) {
      results.push({
        index,
        op,
        status: mode === 'write' ? 'written' : 'planned',
        plannedOperations: planned,
      })
    }

    results.sort((a, b) => a.index - b.index)

    const report: TransformReportV1 = {
      schemaVersion: 1,
      kind: 'TransformReport',
      mode,
      runId,
      ok: mode === 'write' ? (writeBackResult?.failed.length ?? 0) === 0 : true,
      input: { repoRoot: inv.repoRoot, opsFile: inv.opsPath },
      summary: {
        opsTotal: delta.ops.length,
        plannedOperations: plan.summary.writableTotal,
        skippedOps: results.filter((r) => r.status === 'skipped').length,
      },
      results,
    }

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'patch.plan.json',
        outputKey: 'patchPlan',
        kind: 'PatchPlan',
        value: plan,
      }),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'transform.report.json',
        outputKey: 'transformReport',
        kind: 'TransformReport',
        value: report,
      }),
      ...(writeBackResult
        ? [
            yield* makeArtifactOutput({
              outDir: inv.global.outDir,
              budgetBytes: inv.global.budgetBytes,
              fileName: 'writeback.result.json',
              outputKey: 'writeBackResult',
              kind: 'WriteBackResult',
              value: writeBackResult,
            }),
          ]
        : []),
    ]

    const writeFailed = mode === 'write' && (writeBackResult?.failed.length ?? 0) > 0
    if (!writeFailed) {
      return makeCommandResult({
        runId,
        command: 'transform.module',
        mode,
        ok: true,
        artifacts,
      })
    }

    return makeCommandResult({
      runId,
      command: 'transform.module',
      mode,
      ok: false,
      artifacts,
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_VIOLATION_TRANSFORM_WRITEBACK',
          message: '[Logix][CLI] transform module: write-back 未完全成功',
        }),
      ),
    })
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'transform.module',
          mode,
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
