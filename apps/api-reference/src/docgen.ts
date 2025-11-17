import { spawnSync } from 'node:child_process'
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

type Target = {
  readonly id: string
  readonly displayName: string
  readonly summary: string
  readonly entryPoint: string
  readonly tsconfig: string
}

const appDir = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = Path.resolve(appDir, '..', '..')
const distDir = Path.join(appDir, 'dist')

const targets: ReadonlyArray<Target> = [
  {
    id: 'core',
    displayName: '@logix/core',
    summary: '“Core runtime and DSL: Module / Runtime / Flow / Debug …”',
    entryPoint: Path.join(repoRoot, 'packages/logix-core/src/index.ts'),
    tsconfig: Path.join(repoRoot, 'packages/logix-core/tsconfig.json'),
  },
  {
    id: 'react',
    displayName: '@logix/react',
    summary: '“React bindings: Provider / Hooks / ModuleScope …”',
    entryPoint: Path.join(repoRoot, 'packages/logix-react/src/index.ts'),
    tsconfig: Path.join(repoRoot, 'packages/logix-react/tsconfig.json'),
  },
  {
    id: 'sandbox',
    displayName: '@logix/sandbox',
    summary: '“Sandbox client and protocol: browser / worker runtime and integration.”',
    entryPoint: Path.join(repoRoot, 'packages/logix-sandbox/src/index.ts'),
    tsconfig: Path.join(repoRoot, 'packages/logix-sandbox/tsconfig.json'),
  },
]

const rmDist = () => {
  Fs.rmSync(distDir, { recursive: true, force: true })
  Fs.mkdirSync(distDir, { recursive: true })
  Fs.writeFileSync(Path.join(distDir, '.nojekyll'), '')
}

const run = (command: string, args: ReadonlyArray<string>, cwd: string) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`)
  }
}

const generatePackage = (target: Target) => {
  const outDir = Path.join(distDir, target.id)

  run(
    'pnpm',
    [
      'exec',
      'typedoc',
      '--out',
      outDir,
      '--name',
      target.displayName,
      '--readme',
      'none',
      '--tsconfig',
      target.tsconfig,
      '--excludeInternal',
      '--excludePrivate',
      '--excludeProtected',
      target.entryPoint,
    ],
    repoRoot,
  )
}

const generateIndexHtml = () => {
  const generatedAt = new Date().toISOString()
  const dateText = generatedAt.slice(0, 10).replace(/-/g, '.')
  const editionText = 'Early Access · Vol. 01'

  const sectionNameById: Record<string, string> = {
    core: 'Core Kernel',
    react: 'React Bindings',
    sandbox: 'Sandbox Runtime',
  }

  const cards = targets
    .map((t, i) => {
      const section = sectionNameById[t.id] ?? t.id
      const page = `Pg. ${String.fromCharCode(65 + i)}`

      return `            <li class="article">
              <a class="articleLink" href="./${t.id}/index.html" aria-label="Read ${t.displayName} docs">
                <div class="metaRow">
                  <span class="category">&ldquo;${section}&rdquo;</span>
                  <span class="pageNumber">&ldquo;${page}&rdquo;</span>
                </div>
                <h2 class="headline">
                  <span class="highlight-container">${t.displayName}</span>
                </h2>
                <div class="deck">
                  <p>${t.summary}</p>
                </div>
                <div class="actionRow">
                  <span class="action">&ldquo;Read&rdquo;</span>
                  <span class="arrow" aria-hidden="true">→</span>
                </div>
              </a>
            </li>`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Logix API Gazette</title>
    <meta name="description" content="The Logix API Reference Gazette." />
    <style>
      :root {
        --bg: #F9F7F1;
        --ink: #111111;
        --accent: #FFE600; /* Highlighter Yellow */
        --line: #111111;
        --sub: #555555;

        /* Typography */
        --font-serif: "Times New Roman", Times, Baskerville, Georgia, serif;
        --font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
        --font-mono: "Menlo", "Consolas", monospace;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0D1117;
          --ink: #E6EDF3;
          --accent: #238636; /* Blueprint Green */
          --line: #30363D;
          --sub: #8B949E;
        }
      }

      * { box-sizing: border-box; }
      * { border-radius: 0 !important; }

      body {
        margin: 0;
        background-color: var(--bg);
        color: var(--ink);
        font-family: var(--font-serif);
        line-height: 1.5;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        border-top: 6px solid var(--ink); /* Top heavy border */
      }

      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 40px 24px;
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      /* MASTHEAD */
      header {
        border-bottom: 4px double var(--line);
        margin-bottom: 32px;
        padding-bottom: 24px;
        text-align: center;
      }

      .meta-header {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 8px 0;
        border-bottom: 1px solid var(--line);
        margin-bottom: 16px;
      }

      h1 {
        font-family: var(--font-serif);
        font-size: clamp(4rem, 12vw, 8.5rem); /* Massive responsive title */
        line-height: 0.9;
        margin: 0;
        font-weight: 900;
        letter-spacing: -0.04em;
        text-transform: uppercase;
        word-spacing: 0.1em;
      }

      .subhead {
        font-family: var(--font-serif);
        font-style: italic;
        font-size: clamp(1.2rem, 3vw, 1.8rem);
        margin-top: 8px;
        color: var(--sub);
        font-weight: 400;
      }

      /* GRID LAYOUT */
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        border-bottom: 1px solid var(--line);
        list-style: none;
        padding: 0;
        margin: 0;
      }

      /* Responsive Switch */
      @media (max-width: 900px) {
        .grid { grid-template-columns: 1fr; }
      }

      /* ARTICLE CARD */
      .article {
        border-right: 1px solid var(--line);
        padding: 0 24px 32px;
        display: flex;
        flex-direction: column;
      }

      .article:last-child {
        border-right: none;
      }

      @media (max-width: 900px) {
        .article {
          border-right: none;
          border-bottom: 1px solid var(--line);
          padding: 32px 0;
        }
        .article:last-child { border-bottom: none; }
      }

      .articleLink {
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        height: 100%;
        group: hover;
      }

      .metaRow {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-sans);
        font-size: 10px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--sub);
        margin-bottom: 12px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 4px;
      }

      .headline {
        font-size: 2rem;
        font-weight: 800;
        line-height: 1.1;
        margin: 0 0 16px;
        letter-spacing: -0.02em;
      }

      /* HIGHLIGHTER EFFECT */
      .highlight-container {
        background-image: linear-gradient(120deg, var(--accent) 0%, var(--accent) 100%);
        background-repeat: no-repeat;
        background-size: 100% 0.2em;
        background-position: 0 88%;
        transition: background-size 0.25s ease-in;
        padding-bottom: 2px;
      }

      .articleLink:hover .highlight-container {
        background-size: 100% 88%;
        color: var(--ink); /* Ensure contrast */
      }
      /* Dark mode contrast fix for highlight */
      @media (prefers-color-scheme: dark) {
        .articleLink:hover .highlight-container {
          color: #fff;
        }
      }

      .deck {
        font-family: var(--font-serif);
        font-size: 1.1rem;
        line-height: 1.6;
        color: var(--sub);
        margin-bottom: 24px;
        flex: 1;
        text-align: justify;
      }

      .deck p { margin: 0; }

      .actionRow {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-sans);
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.8;
      }

      .articleLink:hover .actionRow { opacity: 1; }
      .articleLink:hover .arrow { transform: translateX(4px); }
      .arrow { transition: transform 0.2s; }

      /* FOOTER */
      footer {
        margin-top: 64px;
        border-top: 4px double var(--line);
        padding-top: 16px;
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--sub);
        text-transform: uppercase;
      }

      /* UTILITIES */
      .badge {
        display: inline-block;
        background: var(--ink);
        color: var(--bg);
        padding: 2px 6px;
        border-radius: 0;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="meta-header">
          <span>&ldquo;Printed in Digital Gardens&rdquo;</span>
          <span>&ldquo;${dateText}&rdquo;</span>
          <span>&ldquo;${editionText}&rdquo;</span>
        </div>
        <h1>Logix</h1>
        <div class="subhead">&ldquo;The Official API Reference & Technical Gazette&rdquo;</div>
      </header>

      <ul class="grid">
${cards}
      </ul>

      <footer>
        <span>&ldquo;Generated from TypeScript types&rdquo;</span>
        <span>&ldquo;Est. 2024&rdquo;</span>
        <span>&ldquo;Logix System&rdquo;</span>
      </footer>
    </div>
  </body>
</html>
`

  Fs.writeFileSync(Path.join(distDir, 'index.html'), html)
}

try {
  rmDist()
  for (const target of targets) {
    generatePackage(target)
  }
  generateIndexHtml()
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
}
