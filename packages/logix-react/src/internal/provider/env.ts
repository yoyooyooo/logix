export const getNodeEnv = (): string | undefined => {
  if (typeof process !== 'undefined' && typeof process.env?.NODE_ENV === 'string') {
    return process.env.NODE_ENV
  }

  const env = (globalThis as { readonly process?: { readonly env?: { readonly NODE_ENV?: unknown } } }).process?.env
  return typeof env?.NODE_ENV === 'string' ? env.NODE_ENV : undefined
}

export const isDevEnv = (): boolean => getNodeEnv() !== 'production'
