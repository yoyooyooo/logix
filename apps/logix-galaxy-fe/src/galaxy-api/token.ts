const TokenKey = 'logix-galaxy.auth.token'

export const tokenStorage = {
  get: (): string | undefined => {
    try {
      const value = localStorage.getItem(TokenKey)
      return value || undefined
    } catch {
      return undefined
    }
  },

  set: (token: string): void => {
    localStorage.setItem(TokenKey, token)
  },

  clear: (): void => {
    localStorage.removeItem(TokenKey)
  },
}
