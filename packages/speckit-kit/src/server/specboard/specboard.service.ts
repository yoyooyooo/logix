import { Context, Effect } from 'effect'

export type ArtifactName = 'spec.md' | 'plan.md' | 'tasks.md' | 'quickstart.md' | 'data-model.md' | 'research.md'

export interface SpecTaskStats {
  readonly total: number
  readonly done: number
  readonly todo: number
}

export interface SpecListItem {
  readonly id: string
  readonly num: number
  readonly title: string
  readonly taskStats?: SpecTaskStats
}

export interface TaskItem {
  readonly line: number
  readonly checked: boolean
  readonly raw: string
  readonly title: string
  readonly taskId?: string
  readonly parallel?: boolean
  readonly story?: string
}

export interface ArtifactFile {
  readonly name: ArtifactName
  readonly path: string
  readonly content: string
}

export type SpecboardError =
  | { readonly _tag: 'ValidationError'; readonly message: string }
  | { readonly _tag: 'NotFoundError'; readonly message: string }
  | { readonly _tag: 'ForbiddenError'; readonly message: string }
  | { readonly _tag: 'ConflictError'; readonly message: string }
  | { readonly _tag: 'InternalError'; readonly message: string }

export interface SpecboardService {
  readonly listSpecs: Effect.Effect<{ readonly items: ReadonlyArray<SpecListItem> }, SpecboardError>
  readonly listTasks: (specId: string) => Effect.Effect<{ readonly specId: string; readonly tasks: ReadonlyArray<TaskItem> }, SpecboardError>
  readonly toggleTask: (input: {
    readonly specId: string
    readonly line: number
    readonly checked: boolean
  }) => Effect.Effect<{ readonly specId: string; readonly tasks: ReadonlyArray<TaskItem> }, SpecboardError>
  readonly readFile: (input: {
    readonly specId: string
    readonly name: ArtifactName
  }) => Effect.Effect<ArtifactFile, SpecboardError>
  readonly writeFile: (input: {
    readonly specId: string
    readonly name: ArtifactName
    readonly content: string
  }) => Effect.Effect<{ readonly name: ArtifactName; readonly path: string }, SpecboardError>
}

export class Specboard extends Context.Tag('Specboard')<Specboard, SpecboardService>() {}
