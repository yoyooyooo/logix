import { Schema } from 'effect'
import * as Logix from '@logix/core'

export const ThemeSchema = Schema.Union(Schema.Literal('light'), Schema.Literal('dark'), Schema.Literal('system'))

export type Theme = Schema.Schema.Type<typeof ThemeSchema>

export const ThemeStateSchema = Schema.Struct({
  theme: ThemeSchema,
})

export type ThemeState = Schema.Schema.Type<typeof ThemeStateSchema>

export const ThemeDef = Logix.Module.make('ThemeModule', {
  state: ThemeStateSchema,
  actions: {
    setTheme: ThemeSchema,
  },
  reducers: {
    setTheme: (state, action) => ({ ...state, theme: action.payload }),
  },
})
