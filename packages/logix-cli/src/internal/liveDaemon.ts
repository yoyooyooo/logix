export interface LiveDaemonTransportProjection {
  readonly kind: 'process-transport-projection'
  readonly ownsRuntimeIdentity: false
}

export const makeLiveDaemonTransportProjection = (): LiveDaemonTransportProjection => ({
  kind: 'process-transport-projection',
  ownsRuntimeIdentity: false,
})
