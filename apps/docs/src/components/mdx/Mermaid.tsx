'use client'

import * as React from 'react'

type MermaidTheme = 'dark' | 'default'
type MermaidLook = 'classic' | 'handDrawn'

let mermaidModulePromise: Promise<any> | null = null
let mermaidRenderQueue: Promise<unknown> = Promise.resolve()

async function loadMermaid() {
  mermaidModulePromise ??= import('mermaid').then((mod) => (mod as any).default ?? mod)
  return mermaidModulePromise
}

function enqueueMermaidRender<T>(task: () => Promise<T>) {
  const next = mermaidRenderQueue.then(task, task)
  mermaidRenderQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function readTheme() {
  const root = document.documentElement
  return root.classList.contains('dark') ? 'dark' : 'default'
}

function mergeClassName(baseClassName: string, className?: string) {
  return className ? `${baseClassName} ${className}` : baseClassName
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function resolveCssColor(value: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  if (!document.body) return undefined

  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.color = value
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color.trim()
  probe.remove()
  if (!resolved) return undefined
  return normalizeColorForMermaid(resolved)
}

function normalizeColorForMermaid(color: string): string | undefined {
  const input = color.trim()
  const lower = input.toLowerCase()
  if (
    lower.startsWith('#') ||
    lower.startsWith('rgb(') ||
    lower.startsWith('rgba(') ||
    lower.startsWith('hsl(') ||
    lower.startsWith('hsla(') ||
    /^[a-z]+$/.test(lower)
  ) {
    return input
  }

  if (lower.startsWith('lab(')) {
    return labToMermaidColor(input)
  }

  return undefined
}

function labToMermaidColor(color: string): string | undefined {
  const match = color.trim().match(/^lab\((.*)\)$/i)
  if (!match) return undefined

  const body = match[1].trim()
  const [channelsPart, alphaPart] = body.split('/')
  const parts = channelsPart
    .replaceAll(',', ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length < 3) return undefined

  const L = parseFloat(parts[0].replace(/%$/, ''))
  const a = parseFloat(parts[1])
  const b = parseFloat(parts[2])
  if (!Number.isFinite(L) || !Number.isFinite(a) || !Number.isFinite(b)) return undefined

  let alpha = 1
  if (alphaPart) {
    const t = alphaPart.trim()
    alpha = t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t)
    if (!Number.isFinite(alpha)) alpha = 1
  }
  alpha = clamp(alpha, 0, 1)

  const { r, g, b: blue } = labToSRgb(L, a, b)
  const ri = clampByte(Math.round(r * 255))
  const gi = clampByte(Math.round(g * 255))
  const bi = clampByte(Math.round(blue * 255))

  if (alpha < 1) return `rgba(${ri}, ${gi}, ${bi}, ${round(alpha, 4)})`
  return `rgb(${ri}, ${gi}, ${bi})`
}

function labToSRgb(L: number, a: number, b: number) {
  // Convert CIE Lab (D50) -> XYZ (D50)
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  const epsilon = 216 / 24389
  const kappa = 24389 / 27

  const fx3 = fx * fx * fx
  const fy3 = fy * fy * fy
  const fz3 = fz * fz * fz

  const xr = fx3 > epsilon ? fx3 : (116 * fx - 16) / kappa
  const yr = L > kappa * epsilon ? fy3 : L / kappa
  const zr = fz3 > epsilon ? fz3 : (116 * fz - 16) / kappa

  // D50 reference white
  let X = xr * 0.96422
  let Y = yr * 1.0
  let Z = zr * 0.82521

  // Bradford adaptation: D50 -> D65
  const X2 = 0.9555766 * X + -0.0230393 * Y + 0.0631636 * Z
  const Y2 = -0.0282895 * X + 1.0099416 * Y + 0.0210077 * Z
  const Z2 = 0.0122982 * X + -0.020483 * Y + 1.3299098 * Z
  X = X2
  Y = Y2
  Z = Z2

  // XYZ (D65) -> linear sRGB
  let r = 3.2404542 * X + -1.5371385 * Y + -0.4985314 * Z
  let g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z
  let blue = 0.0556434 * X + -0.2040259 * Y + 1.0572252 * Z

  r = linearToSrgb(r)
  g = linearToSrgb(g)
  blue = linearToSrgb(blue)

  return { r, g, b: blue }
}

function linearToSrgb(value: number) {
  const v = clamp(value, 0, 1)
  if (v <= 0.0031308) return 12.92 * v
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

type RGBA = { r: number; g: number; b: number; a: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampByte(value: number) {
  return clamp(value, 0, 255)
}

function round(value: number, digits: number) {
  const scale = Math.pow(10, digits)
  return Math.round(value * scale) / scale
}

function parseRgba(color: string): RGBA | undefined {
  const input = color.trim()
  if (!input) return undefined

  if (input.startsWith('#')) {
    return parseHex(input)
  }

  const rgbMatch = input.match(/^rgba?\((.*)\)$/i)
  if (rgbMatch) {
    const body = rgbMatch[1].trim()
    const [channelsPart, alphaPart] = body.split('/')
    const parts = channelsPart
      .replaceAll(',', ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (parts.length < 3) return undefined

    const parseChannel = (value: string) => {
      const t = value.trim()
      if (t.endsWith('%')) return (parseFloat(t) * 255) / 100
      return parseFloat(t)
    }

    const r = parseChannel(parts[0])
    const g = parseChannel(parts[1])
    const b = parseChannel(parts[2])
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return undefined

    let a = 1
    const maybeAlpha = parts.length >= 4 ? parts[3] : alphaPart
    if (maybeAlpha) {
      const t = String(maybeAlpha).trim()
      a = t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t)
      if (!Number.isFinite(a)) a = 1
    }

    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a, 0, 1) }
  }

  return undefined
}

function parseHex(hex: string): RGBA | undefined {
  const raw = hex.replace(/^#/, '').trim()
  if (![3, 4, 6, 8].includes(raw.length)) return undefined

  const expand = (s: string) => s.split('').map((c) => c + c).join('')
  const normalized = raw.length === 3 || raw.length === 4 ? expand(raw) : raw

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if (![r, g, b].every(Number.isFinite)) return undefined

  let a = 1
  if (normalized.length === 8) {
    const ai = parseInt(normalized.slice(6, 8), 16)
    if (Number.isFinite(ai)) a = ai / 255
  }

  return { r, g, b, a }
}

function formatRgba(color: RGBA): string {
  const r = clampByte(Math.round(color.r))
  const g = clampByte(Math.round(color.g))
  const b = clampByte(Math.round(color.b))
  const a = clamp(color.a, 0, 1)
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${round(a, 4)})`
  return `rgb(${r}, ${g}, ${b})`
}

function mixColors(a: string, b: string, weightB: number): string | undefined {
  const ca = parseRgba(a)
  const cb = parseRgba(b)
  if (!ca || !cb) return undefined

  const w = clamp(weightB, 0, 1)
  return formatRgba({
    r: ca.r * (1 - w) + cb.r * w,
    g: ca.g * (1 - w) + cb.g * w,
    b: ca.b * (1 - w) + cb.b * w,
    a: ca.a * (1 - w) + cb.a * w,
  })
}

function isFlowchartDiagram(chart: string) {
  return /^\s*(flowchart|flowchart-elk|graph)\b/i.test(chart)
}

function extractFlowchartNodeIds(chart: string) {
  const nodes: string[] = []
  const seen = new Set<string>()
  const re = /\b([A-Za-z][A-Za-z0-9_-]*)\s*(?=\[|\(|\{)/g
  let match: RegExpExecArray | null = null

  while ((match = re.exec(chart))) {
    const nodeId = match[1]
    if (seen.has(nodeId)) continue
    seen.add(nodeId)
    nodes.push(nodeId)
  }

  return nodes
}

function hashStringToInt(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function mixHash32(value: number) {
  let h = value >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

function nodeFillColorForId(nodeId: string, theme: MermaidTheme) {
  const hue = mixHash32(hashStringToInt(nodeId)) % 360
  const saturation = theme === 'dark' ? 45 : 68
  const lightness = theme === 'dark' ? 28 : 92
  return hslToHex(hue, saturation, lightness)
}

function applyAutoNodeFillPalette(chart: string, theme: MermaidTheme) {
  if (!isFlowchartDiagram(chart)) return chart

  const nodeIds = extractFlowchartNodeIds(chart)
  if (nodeIds.length === 0) return chart

  const lines: string[] = []
  for (const nodeId of nodeIds) {
    const escaped = escapeRegExp(nodeId)

    const hasStyle = new RegExp(`(^|\\n)\\s*style\\s+${escaped}\\b`, 'i').test(chart)
    const hasInlineClass = new RegExp(`\\b${escaped}:::`, 'i').test(chart)
    if (hasStyle || hasInlineClass) continue

    lines.push(`style ${nodeId} fill:${nodeFillColorForId(nodeId, theme)}`)
  }

  if (lines.length === 0) return chart

  return `${chart}\n\n%% auto colorize\n${lines.join('\n')}\n`
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360
  const s = clamp(saturation / 100, 0, 1)
  const l = clamp(lightness / 100, 0, 1)

  if (s === 0) {
    const v = clampByte(Math.round(l * 255))
    return `#${byteToHex(v)}${byteToHex(v)}${byteToHex(v)}`
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360

  const r = hue2rgb(p, q, hk + 1 / 3)
  const g = hue2rgb(p, q, hk)
  const b = hue2rgb(p, q, hk - 1 / 3)

  return `#${byteToHex(clampByte(Math.round(r * 255)))}${byteToHex(clampByte(Math.round(g * 255)))}${byteToHex(clampByte(Math.round(b * 255)))}`
}

function hue2rgb(p: number, q: number, t: number) {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function byteToHex(value: number) {
  return value.toString(16).padStart(2, '0')
}

export function Mermaid(props: {
  chart: string
  className?: string
  look?: MermaidLook
  handDrawnSeed?: number
  colorize?: boolean
}) {
  const { chart, className, look = 'handDrawn', handDrawnSeed, colorize = false } = props
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const reactId = React.useId()
  const [theme, setTheme] = React.useState<MermaidTheme>(() =>
    typeof document === 'undefined' ? 'default' : readTheme(),
  )
  const [error, setError] = React.useState<string | null>(null)

  const mergedClassName = mergeClassName('my-6 overflow-x-auto rounded-xl border bg-muted/20 p-4', className)

  React.useEffect(() => {
    const root = document.documentElement

    const update = () => {
      setTheme(readTheme())
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function render() {
      setError(null)
      const mermaid = await loadMermaid()

      const id = `mmd-${reactId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
      const normalized = chart.replaceAll('\\n', '\n').trim()
      const renderText = colorize ? applyAutoNodeFillPalette(normalized, theme) : normalized

      const docBackground = resolveCssColor('var(--color-background)') ?? '#ffffff'
      const docForeground = resolveCssColor('var(--color-foreground)') ?? '#111827'

      const nodeFill = mixColors(docBackground, docForeground, 0.12) ?? (resolveCssColor('var(--color-muted)') ?? '#f3f4f6')
      const nodeBorder = mixColors(docBackground, docForeground, 0.6) ?? (resolveCssColor('var(--color-border)') ?? '#e5e7eb')
      const edgeLine =
        mixColors(docBackground, docForeground, theme === 'dark' ? 0.6 : 0.5) ??
        (resolveCssColor('var(--color-muted-foreground)') ?? '#6b7280')

      const result = await enqueueMermaidRender(async () => {
        const themeVariables = {
          darkMode: theme === 'dark',
          fontFamily: 'inherit',
          background: docBackground,
          primaryColor: nodeFill,
          primaryTextColor: docForeground,
          primaryBorderColor: nodeBorder,
          lineColor: edgeLine,
          secondaryColor: nodeFill,
          tertiaryColor: nodeFill,
        }

        const config: any = {
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: 'inherit',
          theme: 'base',
          darkMode: theme === 'dark',
          look,
          themeVariables,
        }

        if (look === 'handDrawn') {
          config.handDrawnSeed = handDrawnSeed ?? 7
        }

        mermaid.initialize(config)
        return mermaid.render(id, renderText)
      })
      const svg = typeof result === 'string' ? result : result.svg

      if (cancelled) return
      if (!containerRef.current) return

      containerRef.current.innerHTML = svg

      if (look === 'handDrawn') {
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl) {
          const borderWidth = 2.2
          const borderPaths = svgEl.querySelectorAll<SVGPathElement>('.rough-node path')
          borderPaths.forEach((path) => {
            const stroke = path.getAttribute('stroke')
            if (stroke && stroke === nodeBorder) {
              path.setAttribute('stroke-width', String(borderWidth))
            }
          })
        }
      }

      if (typeof result === 'object' && typeof result.bindFunctions === 'function') {
        result.bindFunctions(containerRef.current)
      }
    }

    render().catch((e) => {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[docs] Mermaid render failed:', message)
      if (cancelled) return
      setError(message)
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''
    })

    return () => {
      cancelled = true
    }
  }, [chart, reactId, theme, look, handDrawnSeed, colorize])

  if (error) {
    return (
      <pre className={mergedClassName} style={{ overflowX: 'auto' }}>
        Mermaid 渲染失败：{error}
      </pre>
    )
  }

  return (
    <div
      className={mergedClassName}
      ref={containerRef}
      role="img"
      aria-label="Mermaid diagram"
      style={{ overflowX: 'auto' }}
    />
  )
}
