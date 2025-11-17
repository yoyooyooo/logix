export type MonacoTypeBundleMeta = {
  readonly generatedAt: string
  readonly packages: ReadonlyArray<{ readonly name: string; readonly version: string }>
  readonly stats?: { readonly filesCount: number; readonly totalBytes: number }
  readonly note?: string
}

export type MonacoTypeBundle = {
  readonly meta: MonacoTypeBundleMeta
  readonly files: Readonly<Record<string, string>>
}
