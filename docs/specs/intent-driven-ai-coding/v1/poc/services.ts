import { Effect } from './effect'

// === 能力服务接口（仅用于出码前管线） ===

export interface FileSystem {
  read(path: string): Promise<string>
  write(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
}

export interface CodeGen {
  // 根据模板 ID 与参数生成若干文件内容，返回 path->content 映射
  generate(
    templateId: string,
    params: Record<string, unknown>
  ): Promise<Array<{ path: string; content: string }>>
}

export interface Logger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

// 聚合 Env 类型，便于 Effect 使用
export interface PlanningEnv {
  fs: FileSystem
  logger: Logger
  // patternRepo / templateRepo 这里简化为普通对象注入
}

export interface ExecutionEnv {
  fs: FileSystem
  codegen: CodeGen
  logger: Logger
}

// 示例：一个简单的 Effect 使用方式（出码管线真正实现里会在别处）
export const exampleEffect: Effect<PlanningEnv, Error, void> =
  async (env) => {
    env.logger.info('running example effect')
  }

