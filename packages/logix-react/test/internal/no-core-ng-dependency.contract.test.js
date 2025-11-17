import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'))
const readLogixReactPackageJson = () => {
  let dir = process.cwd()
  for (let i = 0; i < 20; i++) {
    const candidate = resolve(dir, 'package.json')
    if (existsSync(candidate)) {
      const pkg = readJson(candidate)
      if (pkg?.name === '@logix/react') return pkg
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return readJson(resolve(process.cwd(), 'packages/logix-react/package.json'))
}
describe('contracts (045): @logix/react should not depend on @logix/core-ng', () => {
  it('should not declare @logix/core-ng in dependencies', () => {
    const pkg = readLogixReactPackageJson()
    expect(pkg.dependencies?.['@logix/core-ng']).toBeUndefined()
    expect(pkg.devDependencies?.['@logix/core-ng']).toBeUndefined()
    expect(pkg.peerDependencies?.['@logix/core-ng']).toBeUndefined()
    expect(pkg.optionalDependencies?.['@logix/core-ng']).toBeUndefined()
  })
})
