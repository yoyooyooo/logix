declare module "https://esm.sh/effect@3.19.8" {
  export const Effect: any
}

declare module "fs" {
  const fs: any
  export = fs
}

declare module "path" {
  export function dirname(path: string): string
  export function resolve(...paths: string[]): string
}

declare module "url" {
  export function fileURLToPath(path: string): string
}
