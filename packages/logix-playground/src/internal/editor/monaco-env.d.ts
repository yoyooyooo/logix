declare module '*?worker' {
  const WorkerFactory: {
    new (): Worker
  }
  export default WorkerFactory
}

declare module '*.css' {
  const css: string
  export default css
}

declare module 'monaco-editor/esm/vs/editor/editor.worker.start.js' {
  export const start: (factory: (ctx: unknown) => unknown) => void
}

declare module 'monaco-editor/esm/vs/language/typescript/tsWorker.js' {
  export const create: (ctx: unknown, createData: unknown) => unknown
}
