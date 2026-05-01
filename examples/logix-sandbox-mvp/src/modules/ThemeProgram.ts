import * as Logix from '@logixjs/core'
import { ThemeDef } from './ThemeModule'

export const ThemeProgram = Logix.Program.make(ThemeDef, {
  initial: {
    theme: 'system',
  },
})
