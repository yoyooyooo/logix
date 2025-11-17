#!/usr/bin/env node
// 最小可用脚手架：从 name/layer 推导宏，调用 skt 生成组件骨架
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

function derive(name, layerOpt) {
  let layer = layerOpt || 'ui'
  let comp = name
  if (name.startsWith('ui-')) layer = 'ui'
  if (name.startsWith('pro-')) layer = 'pro'
  if (!name.startsWith('ui-') && !name.startsWith('pro-')) {
    comp = `${layer}-${name}`
  }
  const slug = comp.replace(/^ui-|^pro-/, '')
  const pascal = toPascal(slug)
  return { COMPONENT: comp, LAYER: layer, DOC_SLUG: slug, PASCAL: pascal }
}

function resolveSktBin() {
  // 1) 显式 SKT_BIN 覆盖
  if (process.env.SKT_BIN) return process.env.SKT_BIN

  // 2) 用户包装器 ~/bin/skt
  const home = process.env.HOME || ''
  const wrapper = path.join(home, 'bin/skt')
  if (existsSync(wrapper)) return wrapper

  // 3) 已知本地开发路径（.js 入口）
  const guess = path.join(
    home,
    'Documents/code/personal/skill-template/packages/cli/dist/skt.js'
  )
  if (existsSync(guess)) return `node ${guess}`

  // 4) 回退到 PATH 中的 skt（若存在）
  return 'skt'
}

function parseArgs(argv) {
  const args = argv.slice(2)
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    console.log(
      'Usage: scaffold-ui-component.mjs <name> [--layer ui|pro] [--with-docs] [--with-examples] [--write] [--dry-run]'
    )
    process.exit(0)
  }
  const name = args[0]
  let layer
  let withDocs = false
  let withExamples = false
  let write = false
  let dryRun = true
  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a === '--layer') layer = args[++i]
    else if (a === '--with-docs') withDocs = true
    else if (a === '--with-examples') withExamples = true
    else if (a === '--write') write = true
    else if (a === '--dry-run') dryRun = true
  }
  // 默认安全：dry-run；传 --write 时执行写入
  if (write) dryRun = false
  return { name, layer, withDocs, withExamples, dryRun }
}

function main() {
  const { name, layer, withDocs, withExamples, dryRun } = parseArgs(
    process.argv
  )
  const macros = derive(name, layer)
  const skt = resolveSktBin()

  // 生成器参数
  const templateRoot = '.agent/skills/unit-creator'
  const templateName = 'ui-component'
  const root = '.'
  const macroJson = JSON.stringify(macros)

  const files = []
  if (!withDocs && !withExamples) {
    // 默认全量
  } else {
    // 选择性生成（相对于仓库根的输出路径）
    files.push(
      `apps/www2/registry/default/${macros.LAYER}/${macros.COMPONENT}/index.tsx`,
      `apps/www2/registry/default/${macros.LAYER}/${macros.COMPONENT}/meta.json`
    )
    if (withExamples) {
      files.push(
        `apps/www2/registry/default/examples/${macros.LAYER}/${macros.COMPONENT}/default-demo.tsx`,
        `apps/www2/registry/default/examples/${macros.LAYER}/${macros.COMPONENT}/default-demo.PROMPT.md`
      )
    }
    if (withDocs) {
      files.push(
        `apps/www2/content/docs/${macros.LAYER}/${macros.DOC_SLUG}.mdx`
      )
    }
  }

  const cmd = `${skt} generate --template ${templateName} --template-root ${templateRoot} --root ${root} --macros '${macroJson}' ${
    dryRun ? '--dry-run' : '--no-dry-run --overwrite'
  } --plan-level brief --json ${
    files.length ? '--files ' + files.map((f) => `'${f}'`).join(' ') : ''
  }`

  const res = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
  })
  process.exit(res.status ?? 0)
}

main()
