import { spawnSync } from 'node:child_process'
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)))
const docsDir = Path.resolve(scriptsDir, '..')
const repoRoot = Path.resolve(docsDir, '..', '..')

const apiReferenceAppDir = Path.join(repoRoot, 'apps', 'api-reference')
const apiReferenceDistDir = Path.join(apiReferenceAppDir, 'dist')

const docsPublicDir = Path.join(docsDir, 'public')
const docsApiReferencePublicDir = Path.join(docsPublicDir, 'api-reference')

const args = new Set(process.argv.slice(2))
const shouldBuild = args.has('--build')
const buildIfMissing = args.has('--if-missing')

const run = (command, commandArgs, cwd) => {
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const ensureDist = () => {
  if (shouldBuild) {
    run('pnpm', ['docgen'], apiReferenceAppDir)
    return
  }

  if (buildIfMissing && !Fs.existsSync(apiReferenceDistDir)) {
    run('pnpm', ['docgen'], apiReferenceAppDir)
  }
}

const syncDistToPublic = () => {
  if (!Fs.existsSync(apiReferenceDistDir)) {
    process.stderr.write(`Missing API Reference dist: ${apiReferenceDistDir}\n`)
    process.stderr.write(`Run: pnpm api-reference:build\n`)
    process.exit(1)
  }

  Fs.mkdirSync(docsPublicDir, { recursive: true })
  Fs.rmSync(docsApiReferencePublicDir, { recursive: true, force: true })
  Fs.mkdirSync(docsApiReferencePublicDir, { recursive: true })
  Fs.cpSync(apiReferenceDistDir, docsApiReferencePublicDir, { recursive: true })
}

ensureDist()
syncDistToPublic()
