import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi'
import { Schema } from 'effect'

export const ArtifactName = Schema.Union([
  Schema.Literal('spec.md'),
  Schema.Literal('plan.md'),
  Schema.Literal('tasks.md'),
  Schema.Literal('quickstart.md'),
  Schema.Literal('data-model.md'),
  Schema.Literal('research.md'),
])

export const SpecTaskStats = Schema.Struct({
  total: Schema.Number,
  done: Schema.Number,
  todo: Schema.Number,
})

export const SpecListItem = Schema.Struct({
  id: Schema.String,
  num: Schema.Number,
  title: Schema.String,
  taskStats: Schema.optional(SpecTaskStats),
})

export const SpecListResponse = Schema.Struct({
  items: Schema.Array(SpecListItem),
})

export const TaskItem = Schema.Struct({
  line: Schema.Number,
  checked: Schema.Boolean,
  raw: Schema.String,
  title: Schema.String,
  taskId: Schema.optional(Schema.String),
  parallel: Schema.optional(Schema.Boolean),
  story: Schema.optional(Schema.String),
})

export const TaskListResponse = Schema.Struct({
  specId: Schema.String,
  tasks: Schema.Array(TaskItem),
})

export const TaskToggleRequest = Schema.Struct({
  line: Schema.Number,
  checked: Schema.Boolean,
})

export const FileReadResponse = Schema.Struct({
  name: ArtifactName,
  path: Schema.String,
  content: Schema.String,
})

export const FileWriteRequest = Schema.Struct({
  content: Schema.String,
})

export const FileWriteResponse = Schema.Struct({
  name: ArtifactName,
  path: Schema.String,
})

export const ValidationError = Schema.Struct({
  _tag: Schema.Literal('ValidationError'),
  message: Schema.String,
})

export const NotFoundError = Schema.Struct({
  _tag: Schema.Literal('NotFoundError'),
  message: Schema.String,
})

export const ForbiddenError = Schema.Struct({
  _tag: Schema.Literal('ForbiddenError'),
  message: Schema.String,
})

export const ConflictError = Schema.Struct({
  _tag: Schema.Literal('ConflictError'),
  message: Schema.String,
})

export const InternalError = Schema.Struct({
  _tag: Schema.Literal('InternalError'),
  message: Schema.String,
})

const SpecboardErrors = [
  ValidationError.pipe(HttpApiSchema.status(400)),
  ForbiddenError.pipe(HttpApiSchema.status(403)),
  NotFoundError.pipe(HttpApiSchema.status(404)),
  ConflictError.pipe(HttpApiSchema.status(409)),
  InternalError.pipe(HttpApiSchema.status(500)),
] as const

export const SpecboardGroup = HttpApiGroup.make('Specboard')
  .add(
    HttpApiEndpoint.get('specList', '/specs', {
      success: SpecListResponse,
      error: SpecboardErrors,
    }),
    HttpApiEndpoint.get('taskList', '/specs/:specId/tasks', {
      params: { specId: Schema.String },
      success: TaskListResponse,
      error: SpecboardErrors,
    }),
    HttpApiEndpoint.post('taskToggle', '/specs/:specId/tasks/toggle', {
      params: { specId: Schema.String },
      payload: TaskToggleRequest,
      success: TaskListResponse,
      error: SpecboardErrors,
    }),
    HttpApiEndpoint.get('fileRead', '/specs/:specId/files/:name', {
      params: { specId: Schema.String, name: ArtifactName },
      success: FileReadResponse,
      error: SpecboardErrors,
    }),
    HttpApiEndpoint.put('fileWrite', '/specs/:specId/files/:name', {
      params: { specId: Schema.String, name: ArtifactName },
      payload: FileWriteRequest,
      success: FileWriteResponse,
      error: SpecboardErrors,
    }),
  )
