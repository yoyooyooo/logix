import React from 'react'

export type RenderIsolationRegionId =
  | 'top-command-bar'
  | 'files-panel'
  | 'source-editor'
  | 'runtime-inspector'
  | 'bottom-evidence-drawer'

export interface RenderIsolationProbeState {
  readonly commits: Record<string, number>
  readonly mounts: Record<string, number>
}

declare global {
  interface Window {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: RenderIsolationProbeState
  }
}

export interface RenderIsolationRegionProps {
  readonly id: RenderIsolationRegionId
  readonly children: React.ReactNode
}

const readProbe = (): RenderIsolationProbeState | undefined => {
  if (typeof window === 'undefined') return undefined
  window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ ??= { commits: {}, mounts: {} }
  return window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__
}

const recordProbeEvent = (
  bucket: keyof RenderIsolationProbeState,
  regionId: RenderIsolationRegionId,
): void => {
  const probe = readProbe()
  if (!probe) return
  probe[bucket][regionId] = (probe[bucket][regionId] ?? 0) + 1
}

export const RenderIsolationRegion = ({
  id,
  children,
}: RenderIsolationRegionProps): React.ReactElement => {
  React.useEffect(() => {
    recordProbeEvent('mounts', id)
  }, [id])

  return (
    <React.Profiler id={`playground-region:${id}`} onRender={() => recordProbeEvent('commits', id)}>
      {children}
    </React.Profiler>
  )
}
