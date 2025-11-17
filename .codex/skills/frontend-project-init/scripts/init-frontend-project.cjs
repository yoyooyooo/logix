#!/usr/bin/env node

// 简单的一键初始化脚本：将指定模板拷贝到目标目录。
// 默认模板：vite-logix-empty

const fs = require('fs')
const path = require('path')

const [, , targetArg, templateArg] = process.argv

if (!targetArg) {
  console.error(
    '用法: node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs <target-dir> [template-id]',
  )
  console.error('示例: node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs examples/my-sandbox')
  process.exit(1)
}

const templateId = templateArg || 'vite-logix-empty'

const skillRoot = path.resolve(__dirname, '..')
const templateRoot = path.join(skillRoot, 'assets', templateId)
const targetDir = path.resolve(process.cwd(), targetArg)

if (!fs.existsSync(templateRoot)) {
  console.error(`模板不存在: ${templateId}`)
  console.error(`期待路径: ${templateRoot}`)
  process.exit(1)
}

if (fs.existsSync(targetDir)) {
  const entries = fs.readdirSync(targetDir)
  if (entries.length > 0) {
    console.error(`目标目录已存在且非空: ${targetDir}`)
    console.error('为避免覆盖现有内容，请选择一个新的目录或手动清理后再执行。')
    process.exit(1)
  }
} else {
  fs.mkdirSync(targetDir, { recursive: true })
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src)

  if (stat.isDirectory()) {
    const basename = path.basename(src)
    // 防御性忽略常见产物目录
    if (['node_modules', 'dist', '.turbo', '.git'].includes(basename)) {
      return
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest)
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry))
    }
  } else if (stat.isFile()) {
    const basename = path.basename(src)
    // 防御性忽略常见构建产物
    if (basename === 'tsc_output.txt') {
      return
    }
    fs.copyFileSync(src, dest)
  }
}

copyRecursive(templateRoot, targetDir)

console.log(`✅ 已将模板 ${templateId} 初始化到: ${targetDir}`)
console.log('接下来建议步骤：')
console.log(`  cd ${path.relative(process.cwd(), targetDir) || '.'}`)
console.log('  pnpm install')
console.log('  pnpm run typecheck')
console.log('  pnpm run dev')
