import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string): string => readFileSync(resolve(__dirname, '../../../..', path), 'utf8')

describe('React selector docs surface', () => {
  it('teaches selector inputs first in README and Agent guidance', () => {
    const sources = [
      'packages/logix-react/README.md',
      'skills/logix-best-practices/references/agent-first-api-generation.md',
      'skills/logix-best-practices/references/logix-react-notes.md',
      'skills/logix-best-practices/references/llms/05-react-usage-basics.md',
    ].map(read)

    for (const source of sources) {
      expect(source).toContain('fieldValue')
      expect(source).toContain('fieldValues')
      expect(source).toContain('selector input')
      expect(source).toMatch(/no-arg `useSelector\(handle\)`|无参 `useSelector\(handle\)`|不要生成无参 `useSelector\(handle\)`/)
    }
  })

  it('documents multi-field reads as tuple selector inputs only', () => {
    const sources = [
      'packages/logix-react/README.md',
      'docs/ssot/runtime/10-react-host-projection-boundary.md',
      'docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md',
      'skills/logix-best-practices/references/logix-react-notes.md',
      'skills/logix-best-practices/references/llms/05-react-usage-basics.md',
    ].map(read)

    for (const source of sources) {
      expect(source).toContain('fieldValues')
      expect(source).toMatch(/tuple|readonly tuple|返回 tuple/)
      expect(source).toContain('object/struct projection descriptor')
    }
  })

  it('keeps function selectors out of L0/L1 default recipes', () => {
    const agentGuide = read('skills/logix-best-practices/references/agent-first-api-generation.md')
    const reactNotes = read('skills/logix-best-practices/references/logix-react-notes.md')
    const llmBasics = read('skills/logix-best-practices/references/llms/05-react-usage-basics.md')

    expect(agentGuide).toContain('函数 selector 属于专家输入')
    expect(reactNotes).toContain('L0/L1 生成代码不得把函数 selector 当默认 recipe')
    expect(llmBasics).toContain('L0/L1 默认函数 selector')
  })
})
