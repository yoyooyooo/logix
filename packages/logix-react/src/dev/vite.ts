export interface LogixDevLifecycleVitePlugin {
  readonly name: string
  readonly enforce?: 'pre' | 'post'
  readonly apply?: 'serve' | 'build'
  readonly transformIndexHtml?: (html: string) => string
}

export interface LogixDevLifecycleViteOptions {
  readonly carrierId?: string
}

export const logixDevLifecycleVitePlugin = (
  options: LogixDevLifecycleViteOptions = {},
): LogixDevLifecycleVitePlugin => ({
  name: 'logix-react-dev-lifecycle',
  enforce: 'pre',
  apply: 'serve',
  transformIndexHtml(html) {
    const carrierId = JSON.stringify(options.carrierId ?? '@logixjs/react:vite-dev-lifecycle')
    const script = [
      '<script type="module">',
      'import { installLogixDevLifecycleCarrier } from "/@id/@logixjs/react/dev/lifecycle";',
      `installLogixDevLifecycleCarrier({ carrierId: ${carrierId}, hostKind: "vite" });`,
      '</script>',
    ].join('')

    return html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`
  },
})

export const logixReactDevLifecycle = logixDevLifecycleVitePlugin
