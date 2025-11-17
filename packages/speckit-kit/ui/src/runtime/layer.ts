import { Effect, Layer } from 'effect'

import { ApiResponseError, api } from '../api/client'
import { SpecboardApi } from '../features/kanban'
import type { ArtifactName, FileReadResponse, FileWriteResponse, SpecListResponse, TaskListResponse } from '../api/client'

const toApiError = (e: unknown): ApiResponseError => {
  if (e instanceof ApiResponseError) return e
  if (e instanceof Error) return new ApiResponseError(0, 'Error', e.message)
  return new ApiResponseError(0, 'Error', String(e))
}

export const SpecboardApiLive = Layer.succeed(
  SpecboardApi,
  {
    listSpecs: (): Effect.Effect<SpecListResponse, ApiResponseError> =>
      Effect.tryPromise({
        try: () => api.listSpecs(),
        catch: toApiError,
      }),
    listTasks: (specId: string): Effect.Effect<TaskListResponse, ApiResponseError> =>
      Effect.tryPromise({
        try: () => api.listTasks(specId),
        catch: toApiError,
      }),
    toggleTask: (specId: string, line: number, checked: boolean): Effect.Effect<TaskListResponse, ApiResponseError> =>
      Effect.tryPromise({
        try: () => api.toggleTask(specId, line, checked),
        catch: toApiError,
      }),
    readFile: (specId: string, name: ArtifactName): Effect.Effect<FileReadResponse, ApiResponseError> =>
      Effect.tryPromise({
        try: () => api.readFile(specId, name),
        catch: toApiError,
      }),
    writeFile: (
      specId: string,
      name: ArtifactName,
      content: string,
    ): Effect.Effect<FileWriteResponse, ApiResponseError> =>
      Effect.tryPromise({
        try: () => api.writeFile(specId, name, content),
        catch: toApiError,
      }),
  } satisfies SpecboardApi.Service,
)

export const SpeckitRuntimeLayer = SpecboardApiLive

