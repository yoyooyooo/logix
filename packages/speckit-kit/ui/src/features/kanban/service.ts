import { Context, Effect } from 'effect'

import type {
  ApiResponseError,
  ArtifactName,
  FileReadResponse,
  FileWriteResponse,
  SpecListResponse,
  TaskListResponse,
} from '../../api/client'

export class SpecboardApi extends Context.Tag('SpecboardApi')<SpecboardApi, SpecboardApi.Service>() {}

export namespace SpecboardApi {
  export interface Service {
    readonly listSpecs: () => Effect.Effect<SpecListResponse, ApiResponseError>
    readonly listTasks: (specId: string) => Effect.Effect<TaskListResponse, ApiResponseError>
    readonly toggleTask: (specId: string, line: number, checked: boolean) => Effect.Effect<TaskListResponse, ApiResponseError>
    readonly readFile: (specId: string, name: ArtifactName) => Effect.Effect<FileReadResponse, ApiResponseError>
    readonly writeFile: (specId: string, name: ArtifactName, content: string) => Effect.Effect<FileWriteResponse, ApiResponseError>
  }
}

