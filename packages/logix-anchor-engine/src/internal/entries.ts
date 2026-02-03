import type { Span } from './span.js'

export type TagSymbol = {
  readonly name: string
  readonly declFile?: string
  readonly declSpan?: Span
}

export type ModuleDefEntry = {
  readonly entryKey: string
  readonly kind: 'ModuleDef'
  readonly file: string
  readonly span: Span
  readonly moduleIdLiteral: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export type LogicDefEntry = {
  readonly entryKey: string
  readonly kind: 'LogicDef'
  readonly file: string
  readonly span: Span
  readonly moduleIdLiteral?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export type ServiceUseEntry = {
  readonly entryKey: string
  readonly kind: 'ServiceUse'
  readonly file: string
  readonly span: Span
  readonly moduleIdLiteral?: string
  readonly tagSymbol: TagSymbol
  readonly serviceIdLiteral: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export type WorkflowDefEntry = {
  readonly entryKey: string
  readonly kind: 'WorkflowDef'
  readonly file: string
  readonly span: Span
  readonly workflowLocalIdLiteral: string
  readonly moduleIdLiteral?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export type WorkflowCallUseEntry = {
  readonly entryKey: string
  readonly kind: 'WorkflowCallUse'
  readonly file: string
  readonly span: Span
  readonly workflowLocalIdLiteral: string
  readonly serviceIdLiteral: string
  readonly moduleIdLiteral?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export type MissingField = {
  readonly field: string
  readonly insertSpan: Span
}

export type Missing = {
  readonly services?: MissingField
  readonly devSource?: MissingField
  readonly workflowStepKey?: MissingField
}

export type AutofillTargetRef =
  | { readonly kind: 'module'; readonly moduleIdLiteral: string }
  | { readonly kind: 'workflow'; readonly workflowLocalIdLiteral: string }

export type AutofillTargetEntry = {
  readonly entryKey: string
  readonly kind: 'AutofillTarget'
  readonly file: string
  readonly span: Span
  readonly target: AutofillTargetRef
  readonly missing: Missing
  readonly reasonCodes?: ReadonlyArray<string>
}

export type AnchorEntry =
  | ModuleDefEntry
  | LogicDefEntry
  | ServiceUseEntry
  | WorkflowDefEntry
  | WorkflowCallUseEntry
  | AutofillTargetEntry

export type RawModeEntry = {
  readonly file: string
  readonly span: Span
  readonly reasonCodes: ReadonlyArray<string>
}

