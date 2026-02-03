import { Schema } from 'effect'
import * as Logix from '@logixjs/core'

declare const window: any

// 顶层访问浏览器全局：用于演示 node host 下会失败、browser-mock 下可跑通（best-effort）。
void window

const Counter = Logix.Module.make('CliPlayground.BrowserGlobal', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
  immerReducers: {
    inc: (draft) => {
      draft.count += 1
    },
  },
})

export const AppRoot = Counter.implement({
  initial: { count: 0 },
  logics: [],
})

