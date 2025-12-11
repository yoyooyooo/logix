// 公共环境检测工具：
// - getNodeEnv：通过 globalThis.process.env.NODE_ENV 读取调用方运行环境；
// - isDevEnv：约定为 NODE_ENV !== "production" 即视为开发环境。
// 实际实现下沉到 internal/runtime/core/env.ts，避免在多个包中重复实现。

export { getNodeEnv, isDevEnv } from "./internal/runtime/core/env.js"

