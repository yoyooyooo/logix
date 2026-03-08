import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi'
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

const TodoErrors = [ServiceUnavailableError.pipe(HttpApiSchema.status(503))] as const

export const TodoGroup = HttpApiGroup.make('Todo')
  .add(
    HttpApiEndpoint.post('todoCreate', '/todos', {
      payload: TodoCreateRequest,
      success: TodoDto.pipe(HttpApiSchema.status(201)),
      error: TodoErrors,
    }),
    HttpApiEndpoint.get('todoList', '/todos', {
      success: TodoListResponse,
      error: TodoErrors,
    }),
    HttpApiEndpoint.get('todoGet', '/todos/:id', {
      params: { id: Schema.NumberFromString },
      success: TodoDto,
      error: [...TodoErrors, NotFoundError.pipe(HttpApiSchema.status(404))],
    }),
    HttpApiEndpoint.patch('todoUpdate', '/todos/:id', {
      params: { id: Schema.NumberFromString },
      payload: TodoUpdateRequest,
      success: TodoDto,
      error: [...TodoErrors, NotFoundError.pipe(HttpApiSchema.status(404))],
    }),
    HttpApiEndpoint.delete('todoDelete', '/todos/:id', {
      params: { id: Schema.NumberFromString },
      success: HttpApiSchema.NoContent,
      error: [...TodoErrors, NotFoundError.pipe(HttpApiSchema.status(404))],
    }),
  )
