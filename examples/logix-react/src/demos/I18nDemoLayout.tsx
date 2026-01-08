import React from 'react'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useDispatch, useModule, useSelector } from '@logixjs/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next'
import { I18n, type I18nDriver } from '@logixjs/i18n'
import { I18nDemoDef, I18nDemoModule } from '../modules/i18n-demo'

const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        'demo.greeting': 'Hello, {{name}}!',
      },
    },
    zh: {
      translation: {
        'demo.greeting': '你好，{{name}}！',
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initImmediate: false,
})

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

const i18nDriver: I18nDriver = {
  get language() {
    return i18n.language
  },
  get isInitialized() {
    return i18n.isInitialized
  },
  t: (key, options) => String(i18n.t(key, isPlainRecord(options) ? options : undefined)),
  changeLanguage: (language) => i18n.changeLanguage(language),
  on: (event, handler) => i18n.on(event, handler),
  off: (event, handler) => i18n.off(event, handler),
}

const i18nDemoRuntime = Logix.Runtime.make(I18nDemoModule, {
  label: 'I18nDemoRuntime',
  devtools: true,
  layer: I18n.layer(i18nDriver),
})

const I18nDemoCard: React.FC = () => {
  const demo = useModule(I18nDemoDef)
  const name = useSelector(demo, (s) => s.name)
  const token = useSelector(demo, (s) => s.token)
  const derived = useSelector(demo, (s) => s.derived)
  const dispatch = useDispatch(demo)

  const { t, i18n: i18nReact } = useTranslation()

  const renderedByUi = token ? String(t(token.key, token.options ? { ...token.options } : undefined)) : '(no token)'

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">i18n Demo · root 单例 + message token</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          该示例演示：同一个 i18next 实例同时注入到 React（I18nextProvider）与 Logix（I18n.layer），Logic 产出可回放的
          message token，UI 侧渲染 token 并随语言切换自动更新。
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
              Current Language
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{i18nReact.language}</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">React</span>
              <button
                type="button"
                onClick={() => void i18nReact.changeLanguage('en')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => void i18nReact.changeLanguage('zh')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                中文
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Module</span>
              <button
                type="button"
                onClick={() => dispatch({ _tag: 'setLanguage', payload: 'en' })}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => dispatch({ _tag: 'setLanguage', payload: 'zh' })}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                中文
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Interpolation (name)
          </div>
          <input
            value={name}
            onChange={(e) => dispatch({ _tag: 'setName', payload: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Rendered (UI)
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">{renderedByUi}</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Derived (Logic)
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">{derived.rendered || '(empty)'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            snapshot: {derived.snapshot.language} · {derived.snapshot.init} · seq={derived.snapshot.seq}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Token (JSON)
          </div>
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-auto max-h-[240px]">
            {token ? JSON.stringify(token, null, 2) : '(no token)'}
          </pre>
        </div>
      </div>
    </div>
  )
}

export const I18nDemoLayout: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <RuntimeProvider runtime={i18nDemoRuntime}>
        <I18nDemoCard />
      </RuntimeProvider>
    </I18nextProvider>
  )
}
