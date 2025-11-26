import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface UploadResult {
  fileId: string;
}

export interface ImportTask {
  taskId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
}

// 上传文件并启动导入任务：返回 taskId，任务状态由调用方决定如何处理
export const UploadAndStartImportPattern = definePattern<{
  fileName: string;
  fileSize: number;
}>({
  id: "poc/file-import/upload-and-start",
  version: "1.0.0",
  tags: ["file-import", "upload"],
  config: Schema.Struct({
    fileName: Schema.String,
    fileSize: Schema.Number
  }),
  body: ({ fileName, fileSize }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `fileImport.upload.start name=${fileName} size=${fileSize}`
      );

      const { fileId } = yield* dsl.call<UploadResult>(
        "FileUploadService",
        "upload",
        { name: fileName, size: fileSize }
      );

      yield* dsl.log(
        `fileImport.upload.done fileId=${fileId}`
      );

      const { taskId } = yield* dsl.call<{ taskId: string }>(
        "ImportService",
        "startImport",
        { fileId }
      );

      yield* dsl.log(
        `fileImport.import.start taskId=${taskId}`
      );

      // 将 taskId 写入状态，方便后续轮询使用
      yield* dsl.set("ui.fileImport.taskId", taskId);
    })
});

// 轮询导入任务状态：直到成功或失败
export const PollImportStatusPattern = definePattern<{
  taskId: string;
}>({
  id: "poc/file-import/poll-status",
  version: "1.0.0",
  tags: ["file-import", "polling"],
  config: Schema.Struct({
    taskId: Schema.String
  }),
  body: ({ taskId }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `fileImport.poll.start taskId=${taskId}`
      );

      let status = yield* dsl.call<ImportTask>(
        "ImportService",
        "getImportStatus",
        { taskId }
      );

      while (status.status === "PENDING" || status.status === "RUNNING") {
        yield* dsl.sleep(1_000);
        status = yield* dsl.call<ImportTask>(
          "ImportService",
          "getImportStatus",
          { taskId }
        );
      }

      yield* dsl.log(
        `fileImport.poll.done taskId=${taskId} status=${status.status}`
      );

      yield* dsl.set("ui.fileImport.status", status.status);
    })
});

