export interface LogixDevLifecycleVitePlugin {
  readonly name: string
  readonly enforce?: 'pre' | 'post'
  readonly apply?: 'serve' | 'build'
  readonly transformIndexHtml?: (html: string) => string
}

export interface LogixDevLifecycleViteOptions {
  readonly carrierId?: string
  readonly live?: false | LogixReactLiveBridgeViteOptions
}

export interface LogixReactLiveBridgeViteOptions {
  readonly host?: string
  readonly port?: number
  readonly projectId?: string
}

export const logixDevLifecycleVitePlugin = (
  options: LogixDevLifecycleViteOptions = {},
): LogixDevLifecycleVitePlugin => ({
  name: 'logix-react-dev-lifecycle',
  enforce: 'pre',
  apply: 'serve',
  transformIndexHtml(html) {
    const carrierId = JSON.stringify(options.carrierId ?? '@logixjs/react:vite-dev-lifecycle')
    const live = options.live === false ? undefined : (options.live ?? undefined)
    const liveScript = live
      ? [
          `globalThis[Symbol.for("@logixjs/react/dev-live-browser-adapter-options")] = { host: ${JSON.stringify(live.host ?? '127.0.0.1')}, port: ${JSON.stringify(live.port ?? 8098)}, projectId: ${JSON.stringify(live.projectId)} };`,
          'await import("/@id/@logixjs/react/dev/live");',
        ].join('')
      : ''
    const script = [
      '<script type="module">',
      'import { installLogixDevLifecycleCarrier } from "/@id/@logixjs/react/dev/lifecycle";',
      `installLogixDevLifecycleCarrier({ carrierId: ${carrierId}, hostKind: "vite" });`,
      liveScript,
      '</script>',
    ].join('')

    return html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`
  },
})

export const logixReactDevLifecycle = logixDevLifecycleVitePlugin

export const logixReactLiveBridgeVitePlugin = (options: LogixReactLiveBridgeViteOptions = {}): LogixDevLifecycleVitePlugin =>
  logixDevLifecycleVitePlugin({ live: options })
