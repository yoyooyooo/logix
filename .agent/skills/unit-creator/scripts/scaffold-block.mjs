#!/usr/bin/env node
// 从 Block 名推导宏，调用 skt 生成 Block 骨架
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

function toPascal(kebab) {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function resolveSktBin() {
  if (process.env.SKT_BIN) return process.env.SKT_BIN
  const home = process.env.HOME || ''
  const wrapper = path.join(home, 'bin/skt')
  if (existsSync(wrapper)) return wrapper
  const guess = path.join(
    home,
    'Documents/code/personal/skill-template/packages/cli/dist/skt.js'
  )
  if (existsSync(guess)) return `node ${guess}`
  return 'skt'
}

function parseArgs(argv) {
  const args = argv.slice(2)
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    console.log(
      'Usage: scaffold-block.mjs <block-name> [--write] [--dry-run]\n' +
        'Example: scaffold-block.mjs form --write'
    )
    process.exit(0)
  }
  const name = args[0]
  let write = false
  let dryRun = true
  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a === '--write') write = true
    else if (a === '--dry-run') dryRun = true
  }
  if (write) dryRun = false
  return { name, dryRun }
}

function main() {
  const { name, dryRun } = parseArgs(process.argv)
  const macros = {
    BLOCK_NAME: name,
    BLOCK_COMPONENT: toPascal(name) + 'Block',
  }
  const skt = resolveSktBin()
  const templateRoot = '.agent/skills/unit-creator'
  const templateName = 'block-basic'
  const root = '.'
  const macroJson = JSON.stringify(macros)

  const cmd = `${skt} generate --template ${templateName} --template-root ${templateRoot} --root ${root} --macros '${macroJson}' ${
    dryRun ? '--dry-run' : '--no-dry-run --overwrite'
  } --plan-level brief --json`

  const res = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
  })
  process.exit(res.status ?? 0)
}

main()
