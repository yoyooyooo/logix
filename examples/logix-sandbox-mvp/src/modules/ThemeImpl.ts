import { ThemeDef } from './ThemeModule'

export const ThemeModule = ThemeDef.implement({
  initial: {
    theme: 'system',
  },
})

export const ThemeImpl = ThemeModule.impl
