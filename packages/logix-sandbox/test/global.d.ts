/// <reference types="vitest" />
/// <reference types="vitest/browser" />

declare module "*.js?raw" {
  const source: string
  export default source
}

