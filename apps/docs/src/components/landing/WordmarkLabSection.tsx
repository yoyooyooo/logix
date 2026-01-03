/*
[INPUT]
- lang: 'zh' | 'en'
- copy: landingCopy[lang].wordmarkLab
[OUTPUT]
- 多套 Logix 字标组合候选（字体/强调/动效），按从上到下排列供挑选
[POS]
- apps/docs：Landing/WordmarkLab
*/

'use client'

import { motion } from 'framer-motion'
import {
  Cormorant_Garamond,
  Bricolage_Grotesque,
  DM_Sans,
  Epilogue,
  Fraunces,
  IBM_Plex_Sans,
  Instrument_Sans,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Outfit,
  Plus_Jakarta_Sans,
  Red_Hat_Display,
  Sora,
  Space_Grotesk,
  Urbanist,
} from 'next/font/google'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { springSnappy, viewportOnce } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { LandingLang, WordmarkLabCopy } from './content'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], preload: false })
const sora = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], preload: false })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600', '700'], preload: false })
const manrope = Manrope({ subsets: ['latin'], preload: false })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], preload: false })
const outfit = Outfit({ subsets: ['latin'], preload: false })
const urbanist = Urbanist({ subsets: ['latin'], preload: false })
const dmSans = DM_Sans({ subsets: ['latin'], preload: false })
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['600', '700'], preload: false })
const bricolageGrotesque = Bricolage_Grotesque({ subsets: ['latin'], preload: false })
const fraunces = Fraunces({ subsets: ['latin'], preload: false })
const interTight = Inter_Tight({ subsets: ['latin'], preload: false })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], preload: false })
const redHatDisplay = Red_Hat_Display({ subsets: ['latin'], preload: false })
const epilogue = Epilogue({ subsets: ['latin'], preload: false })
const cormorantGaramond = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], preload: false })

type Accent = 'none' | 'xGradient' | 'underline' | 'drawX' | 'xRing' | 'xSlabs' | 'xTile'
type MotionStyle =
  | 'none'
  | 'lift'
  | 'underlineReveal'
  | 'letterStagger'
  | 'drawX'
  | 'ringDraw'
  | 'slabShift'
  | 'tilePop'

type Variant = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly fontLabel: string
  readonly fontClassName?: string
  readonly wordmarkClassName?: string
  readonly accent: Accent
  readonly motion: MotionStyle
}

function WordmarkFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-background p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background to-muted/30" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[220px] w-[520px] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 opacity-55 dark:opacity-35"
      />
      <div className="relative">{children}</div>
    </div>
  )
}

function WordmarkUnderline() {
  return (
    <motion.div
      className="mt-2 h-1 w-[7ch] origin-left rounded-full bg-gradient-to-r from-primary via-accent to-secondary"
      variants={{
        rest: { scaleX: 0.22, opacity: 0.55 },
        hover: { scaleX: 1, opacity: 1 },
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    />
  )
}

function WordmarkDrawX({ gradientId }: { gradientId: string }) {
  const strokeWidth = 14
  return (
    <span className="relative inline-flex h-[1em] w-[0.92em] items-center justify-center align-[-0.06em]">
      <svg viewBox="0 0 100 100" className="h-[1em] w-[0.92em] overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="55%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--foreground)" />
          </linearGradient>
        </defs>

        <motion.path
          d="M 22 22 L 78 78"
          fill="transparent"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.2, opacity: 0.85 },
            hover: { pathLength: 1, opacity: 1 },
          }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
        <motion.path
          d="M 78 22 L 22 78"
          fill="transparent"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.2, opacity: 0.85 },
            hover: { pathLength: 1, opacity: 1 },
          }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.03 }}
        />
      </svg>
    </span>
  )
}

function WordmarkXSlabs() {
  return (
    <span className="relative inline-flex h-[1em] w-[0.92em] items-center justify-center align-[-0.06em]">
      <motion.span
        className="absolute h-[0.22em] w-[0.92em] rounded-full bg-gradient-to-r from-primary via-accent to-secondary ring-1 ring-border/60"
        variants={{
          rest: { rotate: 45, x: 0, opacity: 0.9 },
          hover: { rotate: 45, x: 1, opacity: 1 },
        }}
        transition={springSnappy}
      />
      <motion.span
        className="absolute h-[0.22em] w-[0.92em] rounded-full bg-gradient-to-r from-secondary via-accent to-primary ring-1 ring-border/60"
        variants={{
          rest: { rotate: -45, x: 0, opacity: 0.9 },
          hover: { rotate: -45, x: -1, opacity: 1 },
        }}
        transition={springSnappy}
      />
    </span>
  )
}

function WordmarkXRing({ gradientId }: { gradientId: string }) {
  const strokeWidth = 8
  const radius = 42
  const circumference = Math.round(2 * Math.PI * radius)
  return (
    <span className="relative inline-flex h-[1em] w-[0.92em] items-center justify-center align-[-0.06em]">
      <svg viewBox="0 0 100 100" className="h-[1em] w-[0.92em] overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="55%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>

        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          variants={{
            rest: { strokeDashoffset: circumference * 0.22, opacity: 0.75 },
            hover: { strokeDashoffset: 0, opacity: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        />

        <motion.path
          d="M 32 32 L 68 68"
          fill="transparent"
          stroke="var(--foreground)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.5, opacity: 0.8 },
            hover: { pathLength: 1, opacity: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        />
        <motion.path
          d="M 68 32 L 32 68"
          fill="transparent"
          stroke="var(--foreground)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.5, opacity: 0.8 },
            hover: { pathLength: 1, opacity: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.03 }}
        />
      </svg>
    </span>
  )
}

function WordmarkXTile() {
  return (
    <motion.span
      className="relative inline-flex h-[1em] w-[0.92em] items-center justify-center rounded-[0.22em] border bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 text-foreground align-[-0.06em]"
      variants={{
        rest: { rotate: 0, scale: 1, opacity: 0.95 },
        hover: { rotate: -2, scale: 1.02, opacity: 1 },
      }}
      transition={springSnappy}
    >
      <span className="text-[0.78em] font-black leading-none">x</span>
    </motion.span>
  )
}

function WordmarkPreview({ lang, variant }: { lang: LandingLang; variant: Variant }) {
  const word = 'Logix'
  const head = word.slice(0, -1)
  const tail = word.slice(-1)

  const labels =
    lang === 'en'
      ? { scheme: 'Option', font: 'Font', accent: 'Accent', motion: 'Motion', hover: 'Hover to preview' }
      : { scheme: '方案', font: '字体', accent: '强调', motion: '动效', hover: '悬停预览动效' }

  const accentLabel = (() => {
    switch (variant.accent) {
      case 'xGradient':
        return lang === 'en' ? 'Gradient X' : 'X 渐变'
      case 'underline':
        return lang === 'en' ? 'Gradient underline' : '渐变下划线'
      case 'drawX':
        return lang === 'en' ? 'Drawn X' : '描边 X'
      case 'xSlabs':
        return lang === 'en' ? 'Slab X' : '块状 X'
      case 'xRing':
        return lang === 'en' ? 'Ring X' : '环形 X'
      case 'xTile':
        return lang === 'en' ? 'Tile X' : '徽章 X'
      default:
        return lang === 'en' ? 'Monochrome' : '纯高对比'
    }
  })()

  const motionLabel = (() => {
    switch (variant.motion) {
      case 'lift':
        return lang === 'en' ? 'Lift' : '轻抬'
      case 'underlineReveal':
        return lang === 'en' ? 'Underline reveal' : '下划线显现'
      case 'letterStagger':
        return lang === 'en' ? 'Letter stagger' : '字母错位'
      case 'drawX':
        return lang === 'en' ? 'Draw X' : '描边绘制'
      case 'ringDraw':
        return lang === 'en' ? 'Ring draw' : '环形描边'
      case 'slabShift':
        return lang === 'en' ? 'Slab shift' : '块状偏移'
      case 'tilePop':
        return lang === 'en' ? 'Tile pop' : '徽章弹性'
      default:
        return lang === 'en' ? 'None' : '无'
    }
  })()

  const letters = word.split('')

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      animate="rest"
      variants={{
        rest: { y: 0 },
        hover: variant.motion === 'lift' ? { y: -2 } : { y: 0 },
      }}
      transition={springSnappy}
      className="rounded-2xl outline-none focus-visible:ring-1 focus-visible:ring-ring"
      tabIndex={0}
      aria-label={labels.hover}
    >
      <WordmarkFrame>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-[260px] flex-col">
            <div
              className={cn(
                'text-5xl sm:text-6xl font-black tracking-tight leading-[0.95] select-none',
                variant.fontClassName,
                variant.wordmarkClassName,
              )}
            >
              {variant.motion === 'letterStagger' ? (
                <span className="inline-flex">
                  {letters.map((ch, idx) => (
                    <motion.span
                      key={`${variant.id}-${ch}-${idx}`}
                      className={ch === tail ? 'text-foreground' : 'text-foreground'}
                      variants={{
                        rest: { y: 0, opacity: 1 },
                        hover: { y: idx % 2 === 0 ? -2 : 1, opacity: 1 },
                      }}
                      transition={{
                        ...springSnappy,
                        delay: idx * 0.015,
                      }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              ) : variant.accent === 'xGradient' ? (
                <>
                  <span className="text-foreground">{head}</span>
                  <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
                    {tail}
                  </span>
                </>
              ) : variant.accent === 'drawX' ? (
                <>
                  <span className="text-foreground">{head}</span>
                  <WordmarkDrawX gradientId={`wordmark-x-${variant.id}`} />
                </>
              ) : variant.accent === 'xSlabs' ? (
                <>
                  <span className="text-foreground">{head}</span>
                  <WordmarkXSlabs />
                </>
              ) : variant.accent === 'xRing' ? (
                <>
                  <span className="text-foreground">{head}</span>
                  <WordmarkXRing gradientId={`wordmark-ring-${variant.id}`} />
                </>
              ) : variant.accent === 'xTile' ? (
                <>
                  <span className="text-foreground">{head}</span>
                  <WordmarkXTile />
                </>
              ) : (
                <span className="text-foreground">{word}</span>
              )}
            </div>

            {variant.accent === 'underline' ? <WordmarkUnderline /> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {labels.scheme} {variant.id}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {labels.font}: {variant.fontLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {labels.accent}: {accentLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {labels.motion}: {motionLabel}
            </Badge>
          </div>
        </div>
      </WordmarkFrame>
    </motion.div>
  )
}

export function WordmarkLabSection({ lang, copy }: { lang: LandingLang; copy: WordmarkLabCopy }) {
  const variants: ReadonlyArray<Variant> =
    lang === 'en'
      ? [
          {
            id: 'A',
            title: 'Classic contrast',
            description: 'High contrast wordmark; only X is a subtle gradient accent.',
            fontLabel: 'Inter (default)',
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'B',
            title: 'Underline (subtle)',
            description: 'Monochrome text + gradient underline. Feels premium and restrained.',
            fontLabel: 'Inter (default)',
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'C',
            title: 'Space Grotesk',
            description: 'More “designed” proportions; good balance between tech and premium.',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'D',
            title: 'Sora (bold)',
            description: 'A bit more geometric and confident; works well with minimal motion.',
            fontLabel: 'Sora',
            fontClassName: sora.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'E',
            title: 'Drawn X',
            description: 'A signature X that can be “drawn” on hover; memorable but still controlled.',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'drawX',
            motion: 'drawX',
          },
          {
            id: 'F',
            title: 'Mono tech',
            description: 'More tool-like. Only recommended if you want stronger “developer-first” vibes.',
            fontLabel: 'JetBrains Mono',
            fontClassName: jetbrainsMono.className,
            accent: 'none',
            motion: 'letterStagger',
          },
          {
            id: 'G',
            title: 'Manrope (clean premium)',
            description: 'Very clean proportions; reads “premium product” without being flashy.',
            fontLabel: 'Manrope',
            fontClassName: manrope.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'H',
            title: 'Plus Jakarta Sans',
            description: 'Modern and friendly; underline accent keeps it restrained.',
            fontLabel: 'Plus Jakarta Sans',
            fontClassName: plusJakartaSans.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'I',
            title: 'Outfit + slab X',
            description: 'Geometric font with a custom slab X; slightly more “designed”.',
            fontLabel: 'Outfit',
            fontClassName: outfit.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'J',
            title: 'Urbanist + ring X',
            description: 'A subtle ring motif around X; elegant and controlled.',
            fontLabel: 'Urbanist',
            fontClassName: urbanist.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'K',
            title: 'IBM Plex Sans + tile X',
            description: 'More “system/tooling” vibe with a small branded tile for X.',
            fontLabel: 'IBM Plex Sans',
            fontClassName: ibmPlexSans.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'L',
            title: 'DM Sans (minimal)',
            description: 'Quiet and readable; gradient X keeps one small signature.',
            fontLabel: 'DM Sans',
            fontClassName: dmSans.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'M',
            title: 'Bricolage Grotesque',
            description: 'More personality while still modern; underline keeps it premium.',
            fontLabel: 'Bricolage Grotesque',
            fontClassName: bricolageGrotesque.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'N',
            title: 'Inter Tight',
            description: 'More compact and “designed” than Inter; great for a tight wordmark.',
            fontLabel: 'Inter Tight',
            fontClassName: interTight.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'O',
            title: 'Fraunces (editorial)',
            description: 'Premium editorial feel; only recommended if you want a softer brand.',
            fontLabel: 'Fraunces',
            fontClassName: fraunces.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'P',
            title: 'Space Grotesk + ring X (signature)',
            description: 'A signature X motif (ring) with a strong wordmark body.',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'Q',
            title: 'Instrument Sans (premium)',
            description: 'Modern premium sans; ring X keeps a single signature.',
            fontLabel: 'Instrument Sans',
            fontClassName: instrumentSans.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'R',
            title: 'Red Hat Display (product)',
            description: 'Display-ish but still clean; underline feels like a mature product brand.',
            fontLabel: 'Red Hat Display',
            fontClassName: redHatDisplay.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'S',
            title: 'Epilogue + tile X',
            description: 'Clean and slightly geometric; tile X works as a tiny logo anchor.',
            fontLabel: 'Epilogue',
            fontClassName: epilogue.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'T',
            title: 'Cormorant Garamond (editorial)',
            description: 'Luxury/editorial direction; keep accents minimal and motion restrained.',
            fontLabel: 'Cormorant Garamond',
            fontClassName: cormorantGaramond.className,
            wordmarkClassName: 'font-bold tracking-tight',
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'U',
            title: 'Instrument Sans + slab X',
            description: 'More engineered signature: slab X with a small shift on hover.',
            fontLabel: 'Instrument Sans',
            fontClassName: instrumentSans.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'V',
            title: 'Inter Tight + draw X',
            description: 'Tight wordmark with a draw-on-hover X; memorable but controlled.',
            fontLabel: 'Inter Tight',
            fontClassName: interTight.className,
            accent: 'drawX',
            motion: 'drawX',
          },
          {
            id: 'W',
            title: 'Manrope + ring X (very restrained)',
            description: 'Cleanest premium baseline; ring motif stays subtle.',
            fontLabel: 'Manrope',
            fontClassName: manrope.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'X',
            title: 'Sora + slab X (bold)',
            description: 'Confident geometry; slab shift reads like a crafted logo detail.',
            fontLabel: 'Sora',
            fontClassName: sora.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'Y',
            title: 'Outfit + tile X (brand mark)',
            description: 'Geometric display with a small badge X; strong brand anchor.',
            fontLabel: 'Outfit',
            fontClassName: outfit.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'Z',
            title: 'Red Hat Display + ring X (signature)',
            description: 'Display-ish premium with a ring motif; designed without being loud.',
            fontLabel: 'Red Hat Display',
            fontClassName: redHatDisplay.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
        ]
      : [
          {
            id: 'A',
            title: '经典高对比',
            description: '整词高对比，只把 X 做为轻量渐变强调。',
            fontLabel: 'Inter（默认）',
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'B',
            title: '下划线（更克制）',
            description: '纯高对比字形 + 渐变下划线，更像成熟品牌而不是“彩色字”。',
            fontLabel: 'Inter（默认）',
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'C',
            title: 'Space Grotesk',
            description: '比例更“设计感”，科技与高级之间更平衡。',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'D',
            title: 'Sora（更几何）',
            description: '更几何、更有自信，配合克制动效很稳。',
            fontLabel: 'Sora',
            fontClassName: sora.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'E',
            title: '描边 X（记忆点）',
            description: '把 X 做成可描边绘制的签名字形：更有记忆点，但仍保持克制。',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'drawX',
            motion: 'drawX',
          },
          {
            id: 'F',
            title: 'Mono（偏工具感）',
            description: '更偏“开发者工具”的气质；如果你想更产品化/品牌化，一般不选它。',
            fontLabel: 'JetBrains Mono',
            fontClassName: jetbrainsMono.className,
            accent: 'none',
            motion: 'letterStagger',
          },
          {
            id: 'G',
            title: 'Manrope（清爽高级）',
            description: '非常干净的比例与字面，读起来像“成熟产品”而不花哨。',
            fontLabel: 'Manrope',
            fontClassName: manrope.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'H',
            title: 'Plus Jakarta Sans',
            description: '更现代、更友好；用下划线做签名更克制。',
            fontLabel: 'Plus Jakarta Sans',
            fontClassName: plusJakartaSans.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'I',
            title: 'Outfit + 块状 X',
            description: '几何字体 + 定制块状 X，整体更“设计感”。',
            fontLabel: 'Outfit',
            fontClassName: outfit.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'J',
            title: 'Urbanist + 环形 X',
            description: '给 X 加一个克制的“环形”母题：更优雅、更可控。',
            fontLabel: 'Urbanist',
            fontClassName: urbanist.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'K',
            title: 'IBM Plex Sans + 徽章 X',
            description: '更偏系统/工具的调性，用一个小徽章把 X 变成品牌锚点。',
            fontLabel: 'IBM Plex Sans',
            fontClassName: ibmPlexSans.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'L',
            title: 'DM Sans（极简）',
            description: '更“安静”的字形，靠一个轻量渐变 X 保留签名即可。',
            fontLabel: 'DM Sans',
            fontClassName: dmSans.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'M',
            title: 'Bricolage Grotesque（更有性格）',
            description: '更有一点性格但仍现代；用下划线把气质拉回高级与克制。',
            fontLabel: 'Bricolage Grotesque',
            fontClassName: bricolageGrotesque.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'N',
            title: 'Inter Tight（更像定制字标）',
            description: '比 Inter 更紧凑、更像“定制 wordmark”，适合作为品牌字标。',
            fontLabel: 'Inter Tight',
            fontClassName: interTight.className,
            accent: 'xGradient',
            motion: 'lift',
          },
          {
            id: 'O',
            title: 'Fraunces（偏 Editorial）',
            description: '更偏“编辑/高端刊物”的气质；只有你想要更柔和、更高级的品牌时才考虑。',
            fontLabel: 'Fraunces',
            fontClassName: fraunces.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'P',
            title: 'Space Grotesk + 环形 X（签名款）',
            description: '用“环形 X”做记忆点，同时保持字标主体强势与克制。',
            fontLabel: 'Space Grotesk',
            fontClassName: spaceGrotesk.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'Q',
            title: 'Instrument Sans（更像品牌）',
            description: '更现代、更“高级产品”的字形；用环形 X 保留一个克制的签名点。',
            fontLabel: 'Instrument Sans',
            fontClassName: instrumentSans.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'R',
            title: 'Red Hat Display（更像产品标题）',
            description: '更像成熟产品的“展示字体”，用下划线做签名更克制。',
            fontLabel: 'Red Hat Display',
            fontClassName: redHatDisplay.className,
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'S',
            title: 'Epilogue + 徽章 X',
            description: '干净且略几何；用一个小徽章把 X 变成 logo 锚点。',
            fontLabel: 'Epilogue',
            fontClassName: epilogue.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'T',
            title: 'Cormorant Garamond（偏奢侈/Editorial）',
            description: '更偏“高级刊物/奢侈品”的方向；强调与动效都要更克制。',
            fontLabel: 'Cormorant Garamond',
            fontClassName: cormorantGaramond.className,
            wordmarkClassName: 'font-bold tracking-tight',
            accent: 'underline',
            motion: 'underlineReveal',
          },
          {
            id: 'U',
            title: 'Instrument Sans + 块状 X',
            description: '更“工程化”的签名：块状 X 轻微偏移，像定制字标细节。',
            fontLabel: 'Instrument Sans',
            fontClassName: instrumentSans.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'V',
            title: 'Inter Tight + 描边 X',
            description: '紧凑字标 + 悬停描边绘制 X：更有记忆点但不吵。',
            fontLabel: 'Inter Tight',
            fontClassName: interTight.className,
            accent: 'drawX',
            motion: 'drawX',
          },
          {
            id: 'W',
            title: 'Manrope + 环形 X（极克制）',
            description: '非常“干净的高级感”基线；环形母题只做轻量存在。',
            fontLabel: 'Manrope',
            fontClassName: manrope.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
          {
            id: 'X',
            title: 'Sora + 块状 X（更自信）',
            description: '更自信的几何感；块状偏移像手工打磨出来的 logo 细节。',
            fontLabel: 'Sora',
            fontClassName: sora.className,
            accent: 'xSlabs',
            motion: 'slabShift',
          },
          {
            id: 'Y',
            title: 'Outfit + 徽章 X（品牌锚点）',
            description: '几何展示字形 + 徽章 X：更像“有 logo 的产品”。',
            fontLabel: 'Outfit',
            fontClassName: outfit.className,
            accent: 'xTile',
            motion: 'tilePop',
          },
          {
            id: 'Z',
            title: 'Red Hat Display + 环形 X（签名款）',
            description: '更像成熟产品的展示字形 + 环形母题：有设计感但不花。',
            fontLabel: 'Red Hat Display',
            fontClassName: redHatDisplay.className,
            accent: 'xRing',
            motion: 'ringDraw',
          },
        ]

  return (
    <section aria-labelledby="landing-wordmark-lab-title" className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle id="landing-wordmark-lab-title" className="text-2xl sm:text-3xl tracking-tight">
            {copy.title}
          </CardTitle>
          <CardDescription className="max-w-3xl">{copy.description}</CardDescription>
          <div className="pt-1 text-sm text-muted-foreground">{copy.hint}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {variants.map((variant) => (
            <motion.div
              key={variant.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {lang === 'en' ? 'Option' : '方案'} {variant.id}
                  </Badge>
                  <div className="text-sm font-semibold text-foreground">{variant.title}</div>
                </div>
                <div className="text-xs text-muted-foreground">{variant.description}</div>
              </div>

              <WordmarkPreview lang={lang} variant={variant} />
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
