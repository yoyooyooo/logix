import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

export const TodoDto = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.String,
})

export const TodoListResponse = Schema.Array(TodoDto)

export const TodoCreateRequest = Schema.Struct({
  title: Schema.String,
  completed: Schema.optional(Schema.Boolean),
})

export const TodoUpdateRequest = Schema.Struct({
  title: Schema.optional(Schema.String),
  completed: Schema.optional(Schema.Boolean),
})

export const NotFoundError = Schema.Struct({
  _tag: Schema.Literal('NotFoundError'),
  message: Schema.String,
})

export const ServiceUnavailableError = Schema.Struct({
  _tag: Schema.Literal('ServiceUnavailableError'),
  message: Schema.String,
})

export const TodoGroup = HttpApiGroup.make('Todo')
  .addError(ServiceUnavailableError, { status: 503 })
  .add(HttpApiEndpoint.post('todoCreate')`/todos`.setPayload(TodoCreateRequest).addSuccess(TodoDto, { status: 201 }))
  .add(HttpApiEndpoint.get('todoList')`/todos`.addSuccess(TodoListResponse))
  .add(
    HttpApiEndpoint.get('todoGet')`/todos/${HttpApiSchema.param('id', Schema.NumberFromString)}`
      .addSuccess(TodoDto)
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.patch('todoUpdate')`/todos/${HttpApiSchema.param('id', Schema.NumberFromString)}`
      .setPayload(TodoUpdateRequest)
      .addSuccess(TodoDto)
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.del('todoDelete')`/todos/${HttpApiSchema.param('id', Schema.NumberFromString)}`
      .addSuccess(Schema.Void, { status: 204 })
      .addError(NotFoundError, { status: 404 }),
  )
