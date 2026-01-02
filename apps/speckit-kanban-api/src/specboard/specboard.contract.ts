import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

export const ArtifactName = Schema.Union(
  Schema.Literal('spec.md'),
  Schema.Literal('plan.md'),
  Schema.Literal('tasks.md'),
  Schema.Literal('quickstart.md'),
  Schema.Literal('data-model.md'),
  Schema.Literal('research.md'),
)

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

export const SpecboardGroup = HttpApiGroup.make('Specboard')
  .addError(ValidationError, { status: 400 })
  .addError(ForbiddenError, { status: 403 })
  .addError(NotFoundError, { status: 404 })
  .addError(ConflictError, { status: 409 })
  .addError(InternalError, { status: 500 })
  .add(HttpApiEndpoint.get('specList')`/specs`.addSuccess(SpecListResponse))
  .add(
    HttpApiEndpoint.get('taskList')`/specs/${HttpApiSchema.param('specId', Schema.String)}/tasks`.addSuccess(
      TaskListResponse,
    ),
  )
  .add(
    HttpApiEndpoint.post('taskToggle')`/specs/${HttpApiSchema.param('specId', Schema.String)}/tasks/toggle`
      .setPayload(TaskToggleRequest)
      .addSuccess(TaskListResponse),
  )
  .add(
    HttpApiEndpoint.get(
      'fileRead',
    )`/specs/${HttpApiSchema.param('specId', Schema.String)}/files/${HttpApiSchema.param('name', ArtifactName)}`.addSuccess(
      FileReadResponse,
    ),
  )
  .add(
    HttpApiEndpoint.put(
      'fileWrite',
    )`/specs/${HttpApiSchema.param('specId', Schema.String)}/files/${HttpApiSchema.param('name', ArtifactName)}`
      .setPayload(FileWriteRequest)
      .addSuccess(FileWriteResponse),
  )
