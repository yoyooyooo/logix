// Environment detection is centralized in @logix/core/Env to avoid duplication across packages.
// This way, both Runtime and React bindings observe the real caller runtime environment via globalThis.process.env.NODE_ENV,
// and the final app bundler decides whether to perform constant folding and DCE.
export { getNodeEnv, isDevEnv } from '@logix/core/Env'
