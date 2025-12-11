// 统一的运行时环境检测，避免 bundler 在构建期内联 NODE_ENV。
export const getNodeEnv = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any)?.process?.env
    return typeof env?.NODE_ENV === "string" ? env.NODE_ENV : undefined
  } catch {
    return undefined
  }
}

export const isDevEnv = (): boolean => getNodeEnv() !== "production"
