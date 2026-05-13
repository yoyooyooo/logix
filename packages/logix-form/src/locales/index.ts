export type FormBuiltinRuleCatalog = Readonly<Record<string, string>>

export { enUS } from './enUS.js'
export { zhCN } from './zhCN.js'

export const assertNoCatalogConflicts = (...catalogs: ReadonlyArray<FormBuiltinRuleCatalog>): void => {
  const ownerByKey = new Map<string, number>()

  for (let i = 0; i < catalogs.length; i++) {
    const catalog = catalogs[i]!
    for (const key of Object.keys(catalog)) {
      const previousOwner = ownerByKey.get(key)
      if (previousOwner !== undefined) {
        throw new Error(`[Form.locales] authoring error: duplicate default locale key "${key}"`)
      }
      ownerByKey.set(key, i)
    }
  }
}
