import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const readJson = (filePath: string) => JSON.parse(readFileSync(filePath, 'utf8')) as any

const readLogixReactPackageJson = () => {
  let dir = process.cwd()

  for (let i = 0; i < 20; i++) {
    const candidate = resolve(dir, 'package.json')
    if (existsSync(candidate)) {
      const pkg = readJson(candidate)
      if (pkg?.name === '@logixjs/react') return pkg
    }

    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return readJson(resolve(process.cwd(), 'packages/logix-react/package.json'))
}

describe('contracts (045): @logixjs/react should not depend on @logixjs/core-ng', () => {
  it('should not declare @logixjs/core-ng in dependencies', () => {
    const pkg = readLogixReactPackageJson()

    expect(pkg.dependencies?.['@logixjs/core-ng']).toBeUndefined()
    expect(pkg.devDependencies?.['@logixjs/core-ng']).toBeUndefined()
    expect(pkg.peerDependencies?.['@logixjs/core-ng']).toBeUndefined()
    expect(pkg.optionalDependencies?.['@logixjs/core-ng']).toBeUndefined()
  })
})
