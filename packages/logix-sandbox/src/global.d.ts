declare module 'https://esm.sh/effect@3.19.13' {
  export const Effect: any
  export const Logger: any
  export const LogLevel: any
}

declare module 'fs' {
  const fs: any
  export default fs
}

declare module 'path' {
  export function dirname(path: string): string
  export function resolve(...paths: string[]): string
}

declare module 'url' {
  export function fileURLToPath(path: string): string
}
