import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { Mermaid } from '@/components/mdx/Mermaid'
import { Playground } from '@/components/playground/Playground'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Mermaid,
    Playground,
    ...components,
  } as MDXComponents
}
