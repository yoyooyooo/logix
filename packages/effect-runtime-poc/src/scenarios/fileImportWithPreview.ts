import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";
import type { ImportTask, UploadFile, FileImportEnv } from "./fileImport";
import { uploadAndStartImportFlow } from "./fileImport";

export interface ImportPreviewRow {
  index: number;
  raw: Record<string, unknown>;
  valid: boolean;
  errors?: string[];
}

export interface ImportPreview {
  total: number;
  validCount: number;
  invalidCount: number;
  sampleRows: ImportPreviewRow[];
}

export interface ImportPreviewService {
  analyze: (file: UploadFile) => Promise<ImportPreview>;
}

export interface ImportResultService {
  getImportResult: (taskId: string) => Promise<{
    task: ImportTask;
    failedRows?: ImportPreviewRow[];
  }>;
}

export interface ImportNotificationService {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string) => void;
}

export class ImportPreviewServiceTag extends Context.Tag(
  "ImportPreviewService",
)<ImportPreviewServiceTag, ImportPreviewService>() {}

export class ImportResultServiceTag extends Context.Tag(
  "ImportResultService",
)<ImportResultServiceTag, ImportResultService>() {}

export class ImportNotificationServiceTag extends Context.Tag(
  "ImportNotificationService",
)<ImportNotificationServiceTag, ImportNotificationService>() {}

export type FileImportWithPreviewEnv =
  | FileImportEnv
  | LoggerTag
  | ImportPreviewServiceTag
  | ImportResultServiceTag
  | ImportNotificationServiceTag;

export const analyzeAndMaybeImportFlow = (
  file: UploadFile,
  options: {
    autoStart: boolean;
  },
): Effect.Effect<
  {
    preview: ImportPreview;
    taskId?: string;
  },
  never,
  FileImportWithPreviewEnv
> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const previewService = yield* ImportPreviewServiceTag;
    const notify = yield* ImportNotificationServiceTag;

    logger.info("fileImport.preview.start", {
      name: file.name,
      size: file.size,
    });

    const preview = yield* Effect.promise(() =>
      previewService.analyze(file),
    );
    logger.info("fileImport.preview.done", {
      total: preview.total,
      invalid: preview.invalidCount,
    });

    if (!options.autoStart) {
      return { preview };
    }

    if (preview.invalidCount > 0) {
      notify.warn?.("存在无效行，仍将继续导入");
    }

    const { taskId } = yield* uploadAndStartImportFlow(file);

    notify.info?.("导入任务已提交，稍后可在导入记录中查看结果");

    return { preview, taskId };
  });

export const fetchImportResultFlow = (
  taskId: string,
): Effect.Effect<
  {
    task: ImportTask;
    failedRows?: ImportPreviewRow[];
  },
  never,
  FileImportWithPreviewEnv
> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const resultService = yield* ImportResultServiceTag;
    const notify = yield* ImportNotificationServiceTag;

    logger.info("fileImport.result.fetch.start", { taskId });

    const result = yield* Effect.promise(() =>
      resultService.getImportResult(taskId),
    );

    if (result.task.status === "FAILED") {
      notify.error?.("导入失败，请检查错误明细");
    } else if (result.failedRows?.length) {
      notify.warn?.("导入已完成，但存在部分失败行");
    } else {
      notify.info?.("导入成功");
    }

    logger.info("fileImport.result.fetch.done", {
      taskId,
      status: result.task.status,
      failedCount: result.failedRows?.length ?? 0,
    });

    return result;
  });
