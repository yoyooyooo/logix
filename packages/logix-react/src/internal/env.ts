// 环境检测统一托管给 @logix/core/env，避免在多个包中重复实现。
// 这样无论 Runtime 还是 React 绑定，都会通过 globalThis.process.env.NODE_ENV
// 观察调用方真实运行环境，由最终业务 bundler 决定是否做常量折叠与 DCE。
export { getNodeEnv, isDevEnv } from "@logix/core/env"
