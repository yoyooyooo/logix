import * as esbuild from 'esbuild-wasm'

let initialized = false
let kernelPath = '/sandbox/logix-core.js'
let effectRootPath = '/sandbox/effect.js'

const ESM_SH_ORIGIN = 'https://esm.sh'
const EFFECT_SCOPE_VERSION = '0.94.0'
const LOCAL_AT_EFFECT_PACKAGES = new Set<string>(['platform'])

const remoteModuleCache = new Map<string, string>()

const simplifyModuleKey = (value: string): string => value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

let logixCoreSubpathSet: Set<string> | null = null
let logixCoreSubpathKeyToCanonical: Map<string, string> | null = null

export function setLogixCoreSubpaths(specifiers: ReadonlyArray<string>): void {
  logixCoreSubpathSet = new Set(specifiers)
  logixCoreSubpathKeyToCanonical = new Map()
  for (const specifier of specifiers) {
    logixCoreSubpathKeyToCanonical.set(simplifyModuleKey(specifier), specifier)
  }
}

const fetchRemoteModule = async (url: string): Promise<string> => {
  const cached = remoteModuleCache.get(url)
  if (cached !== undefined) {
    return cached
  }
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`[sandbox.compiler] fetch failed: ${String(res.status)} ${String(res.statusText)} (${url})`)
  }
  const text = await res.text()
  remoteModuleCache.set(url, text)
  return text
}

const toAbsoluteUrl = (value: string): string => {
  try {
    return new URL(value).toString()
  } catch {
    // fallthrough
  }

  try {
    const base = (globalThis as any).location?.href
    if (typeof base === 'string' && base.length > 0) {
      const baseUrl = new URL(base)
      const origin = baseUrl.origin !== 'null' ? baseUrl.origin : undefined
      if (origin) {
        return new URL(value, origin).toString()
      }
      if (baseUrl.protocol === 'http:' || baseUrl.protocol === 'https:') {
        return new URL(value, baseUrl.href).toString()
      }
    }
  } catch {
    // fallthrough
  }

  return value
}

const toSiblingPath = (basePath: string, fileName: string): string => {
  try {
    if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
      return new URL(`./${fileName}`, basePath).toString()
    }
  } catch {
    // fallthrough
  }

  const trimmed = basePath.split('?')[0].split('#')[0]
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash >= 0) {
    return `${trimmed.slice(0, lastSlash)}/${fileName}`
  }
  return `/${fileName}`
}

const pinEffectScope = (specifier: string): string => {
  if (!specifier.startsWith('@effect/')) {
    return specifier
  }

  // Examples:
  // - @effect/platform          -> @effect/platform@0.94.0
  // - @effect/platform/Path     -> @effect/platform@0.94.0/Path
  // - @effect/platform@0.94.0   -> (keep)
  const match = specifier.match(/^@effect\/([^@/]+)(@[^/]+)?(\/.*)?$/)
  if (!match) {
    return specifier
  }
  const name = match[1]
  const versionPart = match[2]
  const rest = match[3] ?? ''
  if (versionPart) {
    return specifier
  }
  return `@effect/${name}@${EFFECT_SCOPE_VERSION}${rest}`
}

const tryParseEsmEffectSubpath = (url: URL): string | null => {
  if (url.origin !== ESM_SH_ORIGIN) {
    return null
  }

  const match = url.pathname.match(/^\/(?:v\d+\/)?effect@[^/]+(?:\/(.*))?$/)
  const rest = match?.[1]
  // root: /effect@x or /effect@^x
  if (!rest) {
    return ''
  }

  // /effect@x/es2022/Context.mjs -> Context
  const esModuleMatch = rest.match(/^es\d+\/([^/]+)\.mjs$/)
  if (esModuleMatch?.[1]) {
    return esModuleMatch[1]
  }

  // /effect@x/Context -> Context
  if (!rest.includes('/')) {
    return rest
  }

  return null
}

const tryParseEsmAtEffectSubpath = (url: URL): { pkg: string; subpath: string } | null => {
  if (url.origin !== ESM_SH_ORIGIN) {
    return null
  }

  // Examples:
  // - /@effect/platform@0.94.0               -> { pkg: "platform", subpath: "" }
  // - /@effect/platform@0.94.0/Path          -> { pkg: "platform", subpath: "Path" }
  // - /@effect/platform@0.94.0/es2022/Path.mjs -> { pkg: "platform", subpath: "Path" }
  const match = url.pathname.match(/^\/(?:v\d+\/)?@effect\/([^@/]+)@[^/]+(?:\/(.*))?$/)
  const pkg = match?.[1]
  const rest = match?.[2]
  if (!pkg) {
    return null
  }
  if (!rest) {
    return { pkg, subpath: '' }
  }

  const esModuleMatch = rest.match(/^es\d+\/([^/]+)\.mjs$/)
  if (esModuleMatch?.[1]) {
    return { pkg, subpath: esModuleMatch[1] }
  }

  if (!rest.includes('/')) {
    return { pkg, subpath: rest.replace(/\.mjs$/, '') }
  }

  return null
}

const toEffectPath = (subpath: string | null): string => {
  if (!subpath) {
    return effectRootPath
  }
  return toSiblingPath(kernelPath, `effect/${subpath}.js`)
}

const toAtEffectPath = (pkg: string, subpath: string | null): string => {
  if (!subpath) {
    return toSiblingPath(kernelPath, `@effect/${pkg}.js`)
  }
  return toSiblingPath(kernelPath, `@effect/${pkg}/${subpath}.js`)
}

type LogixCoreSubpathInfo = {
  readonly normalized: string
}

const normalizeLogixCoreSubpath = (subpath: string): string => {
  let out = subpath.split('?')[0]?.split('#')[0] ?? subpath
  out = out.replace(/\/+$/, '')
  if (out.endsWith('.js')) {
    out = out.slice(0, -'.js'.length)
  }
  if (out.endsWith('/index')) {
    out = out.slice(0, -'/index'.length)
  }
  const segments = out.split('/').filter(Boolean)
  return segments.join('/')
}

const getLogixCoreSubpathInfo = (raw: string): LogixCoreSubpathInfo => {
  const normalized = normalizeLogixCoreSubpath(raw)
  return {
    normalized,
  }
}

const remoteBundlePlugin: esbuild.Plugin = {
  name: 'remote-bundle',
  setup(build) {
    build.onResolve({ filter: /^effect($|\/)/ }, (args) => {
      if (args.path === 'effect') {
        return { path: effectRootPath, external: true }
      }
      const subpath = args.path.slice('effect/'.length)
      return { path: toEffectPath(subpath), external: true }
    })

    // Prefer mapping @effect/platform (root + subpaths) to sandbox built-in artifacts to avoid falling back to esm.sh.
    build.onResolve({ filter: /^@effect\/[^/]+(?:@[^/]+)?$/ }, (args) => {
      const match = args.path.match(/^@effect\/([^@/]+)(?:@[^/]+)?$/)
      const pkg = match?.[1]
      if (!pkg || !LOCAL_AT_EFFECT_PACKAGES.has(pkg)) {
        return null
      }
      return { path: toAtEffectPath(pkg, null), external: true }
    })

    build.onResolve({ filter: /^@effect\/[^/]+(?:@[^/]+)?\// }, (args) => {
      const match = args.path.match(/^@effect\/([^@/]+)(?:@[^/]+)?\/(.+)$/)
      const pkg = match?.[1]
      const subpath = match?.[2] ?? null
      if (!pkg || !LOCAL_AT_EFFECT_PACKAGES.has(pkg)) {
        return null
      }
      return { path: toAtEffectPath(pkg, subpath), external: true }
    })

    build.onResolve({ filter: /^@logix\/core$/ }, () => ({
      path: kernelPath,
      external: true,
    }))

    build.onResolve({ filter: /^@logix\/core\// }, (args) => {
      const rawSubpath = args.path.slice('@logix/core/'.length)
      const info = getLogixCoreSubpathInfo(rawSubpath)
      if (!info.normalized) {
        return {
          errors: [{ text: `非法的 @logix/core 子路径：${args.path}` }],
        }
      }

      const firstSegment = info.normalized.split('/', 1)[0]!
      if (firstSegment.toLowerCase() === 'internal') {
        return {
          errors: [
            {
              text: `禁止在 Sandbox 中 import "@logix/core/internal/*"：${args.path}`,
            },
          ],
        }
      }

      if (info.normalized.includes('.')) {
        return {
          errors: [
            {
              text: `禁止在 Sandbox 中使用 "." 形式的 @logix/core 子路径：${args.path}；请使用 "/" 分隔（例如 "@logix/core/${info.normalized.replaceAll('.', '/')}"）`,
            },
          ],
        }
      }

      if (!logixCoreSubpathSet || !logixCoreSubpathKeyToCanonical) {
        return {
          errors: [
            {
              text: `Sandbox 内置 @logix/core 子路径清单未初始化，无法解析：${args.path}；请确保 /sandbox/logix-core.manifest.json 可访问`,
            },
          ],
        }
      }

      if (!logixCoreSubpathSet.has(info.normalized)) {
        const suggestion = logixCoreSubpathKeyToCanonical.get(simplifyModuleKey(info.normalized))
        if (suggestion) {
          return {
            errors: [
              {
                text: `禁止在 Sandbox 中使用非规范 @logix/core 子路径：${args.path}；请改为 "@logix/core/${suggestion}"`,
              },
            ],
          }
        }
        return {
          errors: [
            {
              text: `未知的 @logix/core 子路径：${args.path}；请改用根导入（例如 "import * as Logix from \\"@logix/core\\""）或检查 kernel 是否已包含该子模块`,
            },
          ],
        }
      }

      const canonicalFile = info.normalized.replaceAll('/', '.')
      return {
        path: toSiblingPath(kernelPath, `logix-core/${canonicalFile}.js`),
        external: true,
      }
    })

    build.onResolve({ filter: /^https?:\/\// }, (args) => {
      const url = new URL(args.path)
      const effectSubpath = tryParseEsmEffectSubpath(url)
      if (effectSubpath !== null) {
        return { path: toEffectPath(effectSubpath), external: true }
      }
      const atEffect = tryParseEsmAtEffectSubpath(url)
      if (atEffect !== null && LOCAL_AT_EFFECT_PACKAGES.has(atEffect.pkg)) {
        return { path: toAtEffectPath(atEffect.pkg, atEffect.subpath), external: true }
      }
      return { path: url.toString(), namespace: 'remote-url' }
    })

    build.onResolve({ filter: /^\// }, (args) => {
      const base =
        args.importer.startsWith('http://') || args.importer.startsWith('https://')
          ? args.importer
          : `${ESM_SH_ORIGIN}/`
      const url = new URL(args.path, base)
      const effectSubpath = tryParseEsmEffectSubpath(url)
      if (effectSubpath !== null) {
        return { path: toEffectPath(effectSubpath), external: true }
      }
      const atEffect = tryParseEsmAtEffectSubpath(url)
      if (atEffect !== null && LOCAL_AT_EFFECT_PACKAGES.has(atEffect.pkg)) {
        return { path: toAtEffectPath(atEffect.pkg, atEffect.subpath), external: true }
      }
      return { path: url.toString(), namespace: 'remote-url' }
    })

    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      if (!(args.importer.startsWith('http://') || args.importer.startsWith('https://'))) {
        return null
      }
      const url = new URL(args.path, args.importer)
      const effectSubpath = tryParseEsmEffectSubpath(url)
      if (effectSubpath !== null) {
        return { path: toEffectPath(effectSubpath), external: true }
      }
      const atEffect = tryParseEsmAtEffectSubpath(url)
      if (atEffect !== null && LOCAL_AT_EFFECT_PACKAGES.has(atEffect.pkg)) {
        return { path: toAtEffectPath(atEffect.pkg, atEffect.subpath), external: true }
      }
      return { path: url.toString(), namespace: 'remote-url' }
    })

    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('effect') || args.path.startsWith('@logix/core')) {
        return null
      }
      const specifier = pinEffectScope(args.path)
      return { path: new URL(specifier, `${ESM_SH_ORIGIN}/`).toString(), namespace: 'remote-url' }
    })

    build.onLoad({ filter: /.*/, namespace: 'remote-url' }, async (args) => {
      const contents = await fetchRemoteModule(args.path)
      return {
        contents,
        loader: 'js',
      }
    })
  },
}

export type CompileResult = { success: true; bundle: string } | { success: false; errors: string[] }

export async function initCompiler(wasmUrl: string): Promise<void> {
  if (initialized) return
  await esbuild.initialize({
    wasmURL: wasmUrl,
    worker: false,
  })
  initialized = true
}

export async function compile(code: string, filename = 'input.tsx'): Promise<CompileResult> {
  if (!initialized) {
    return { success: false, errors: ['编译器未初始化，请先调用 initCompiler()'] }
  }

  try {
    const result = await esbuild.build({
      stdin: {
        contents: code,
        loader: 'tsx',
        resolveDir: '/',
        sourcefile: filename,
      },
      bundle: true,
      format: 'esm',
      write: false,
      plugins: [remoteBundlePlugin],
      target: 'es2020',
      minify: false,
      sourcemap: 'inline',
    })

    if (result.errors.length > 0) {
      return { success: false, errors: result.errors.map((e) => e.text) }
    }

    const bundle = result.outputFiles?.[0]?.text ?? ''
    return { success: true, bundle }
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : String(error)] }
  }
}

export function isInitialized(): boolean {
  return initialized
}

export function setKernelPath(path: string): void {
  const normalized = toAbsoluteUrl(path)
  kernelPath = normalized
  effectRootPath = toSiblingPath(normalized, 'effect.js')
}
