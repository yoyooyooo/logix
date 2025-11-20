import * as Context from "effect/Context";
import type { Logger, Clock } from "../shared/base";

/**
 * 平台级基础能力 Tag（使用 Context.Tag class 形式，便于类型推导）。
 */
export class LoggerTag extends Context.Tag("Logger")<
  LoggerTag,
  Logger
>() {}

export class ClockTag extends Context.Tag("Clock")<
  ClockTag,
  Clock
>() {}

