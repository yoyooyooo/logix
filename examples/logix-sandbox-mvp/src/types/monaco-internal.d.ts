declare module 'monaco-editor/esm/vs/common/initialize.js' {
  export function initialize(callback: (ctx: any, data: any) => any): void
  export function isWorkerInitialized(): boolean
}

declare module 'monaco-editor/esm/vs/language/typescript/tsWorker.js' {
  export function create(ctx: any, createData: any): any
  export class TypeScriptWorker {}
}

declare module 'monaco-editor/esm/vs/editor/editor.worker.start.js' {
  export function start(factory: (ctx: any) => any): void
}
