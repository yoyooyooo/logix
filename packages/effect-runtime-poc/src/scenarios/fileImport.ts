import * as Effect from "effect/Effect";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface UploadResult {
  fileId: string;
}

export interface ImportTask {
  taskId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
}

// 使用自定义 UploadFile 避免直接依赖 DOM File 类型
export interface UploadFile {
  name: string;
  size: number;
  // 可按需扩展为更接近 File 的结构
  raw: unknown;
}

export interface FileUploadService {
  upload: (file: UploadFile) => Promise<UploadResult>;
}

export interface ImportService {
  startImport: (fileId: string) => Promise<{ taskId: string }>;
  getImportStatus: (taskId: string) => Promise<ImportTask>;
}

export class FileUploadServiceTag extends Context.Tag("FileUploadService")<
  FileUploadServiceTag,
  FileUploadService
>() {}

export class ImportServiceTag extends Context.Tag("ImportService")<
  ImportServiceTag,
  ImportService
>() {}

export type FileImportEnv = LoggerTag | FileUploadServiceTag | ImportServiceTag;

// 上传文件并启动导入任务：不包含轮询逻辑，仅返回 taskId。
export const uploadAndStartImportFlow = (
  file: UploadFile,
): Effect.Effect<{ taskId: string }, never, FileImportEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const uploader = yield* FileUploadServiceTag;
    const importer = yield* ImportServiceTag;

    logger.info("fileImport.upload.start", {
      name: file.name,
      size: file.size,
    });
    const { fileId } = yield* Effect.promise(() =>
      uploader.upload(file),
    );
    logger.info("fileImport.upload.done", { fileId });

    const { taskId } = yield* Effect.promise(() =>
      importer.startImport(fileId),
    );
    logger.info("fileImport.import.start", { taskId });

    return { taskId };
  });

// 轮询导入任务状态：与 longTask 场景类似，可重用策略。
export const pollImportStatusFlow = (
  taskId: string,
): Effect.Effect<ImportTask, never, FileImportEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const importer = yield* ImportServiceTag;

    logger.info("fileImport.poll.start", { taskId });
    let status = yield* Effect.promise(() =>
      importer.getImportStatus(taskId),
    );
    while (status.status === "PENDING" || status.status === "RUNNING") {
      yield* Clock.sleep(1000);
      status = yield* Effect.promise(() =>
        importer.getImportStatus(taskId),
      );
    }
    logger.info("fileImport.poll.done", { taskId, status: status.status });
    return status;
  });
