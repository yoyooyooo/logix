declare module 'use-sync-external-store/shim/with-selector.js' {
  import type { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
  export = useSyncExternalStoreWithSelector
}

declare module '*?raw' {
  const content: string
  export default content
}
