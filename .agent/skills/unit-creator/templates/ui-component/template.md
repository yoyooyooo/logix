---
id: imd-ui-component
name: ui-component
version: 1.0.0
description: 用于在 IMD 仓库下快速创建 UI/Pro 组件（含默认 Demo 与文档骨架）
tags: [imd, component, ui, pro, react, tsx]

macros:
  __COMPONENT__:
    desc: 组件完整名（形如 ui-foo-bar 或 pro-foo-bar）
    required: true
  __LAYER__:
    desc: 层级（ui | pro）
    required: true
  __DOC_SLUG__:
    desc: 文档短名（不含前缀，例 hello-world）
    required: true
  __PASCAL__:
    desc: 导出名（PascalCase，例 HelloWorld）
    required: true

templates:
  - path: apps/www2/registry/default/__LAYER__/__COMPONENT__/index.tsx
    out: apps/www2/registry/default/__LAYER__/__COMPONENT__/index.tsx
    lang: tsx
    slots:
      - name: external-imports
        type: ts
        desc: 额外的外部依赖导入
      - name: internal-imports
        type: ts
        desc: 项目内局部依赖导入
      - name: props
        type: ts
        desc: 组件 Props 定义
      - name: state
        type: ts
        desc: 组件内部状态初始化
      - name: render
        type: jsx
        desc: 组件主体渲染内容
    template: |
      'use client'

      /* @slot:external-imports */
      import * as React from 'react'
      import { cn } from '@/lib/utils'
      /* @slot:internal-imports */

      export interface __PASCAL__Props
        extends React.HTMLAttributes<HTMLDivElement> {
        /* @slot:props */
      }

      export const __PASCAL__ = React.forwardRef<
        HTMLDivElement,
        __PASCAL__Props
      >(({ className, ...props }, ref) => {
        /* @slot:state */
        return (
          <div
            ref={ref}
            className={cn(
              'flex items-center justify-center rounded-md border border-dashed border-gray-200 p-6 text-sm text-muted-foreground',
              className
            )}
            data-component="__COMPONENT__"
            {...props}
          >
            {/* @slot:render */}
            __PASCAL__
          </div>
        )
      })

      __PASCAL__.displayName = '__PASCAL__'

      export type { __PASCAL__Props }

  - path: apps/www2/registry/default/__LAYER__/__COMPONENT__/meta.json
    out: apps/www2/registry/default/__LAYER__/__COMPONENT__/meta.json
    lang: json
    template: |
      {
        "description": "__COMPONENT__ 组件（自动生成骨架）",
        "tags": ["__DOC_SLUG__", "component", "skeleton"],
        "dependencies": [],
        "registryDependencies": []
      }

  - path: apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.tsx
    out: apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.tsx
    lang: tsx
    slots:
      - name: demo-state
        type: ts
        desc: Demo 内使用的额外状态
      - name: demo-body
        type: jsx
        desc: Demo JSX 内容
    template: |
      'use client'
      import * as React from 'react'
      import { __PASCAL__ } from '@/registry/default/__LAYER__/__COMPONENT__'

      export default function __PASCAL__DefaultDemo() {
        /* @slot:demo-state */
        return (
          <div className="flex h-full w-full flex-col justify-start gap-4 p-6">
            {/* @slot:demo-body */}
            <__PASCAL__ className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-muted-foreground">
              TODO: 演示 __PASCAL__
            </__PASCAL__>
          </div>
        )
      }

  - path: apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.PROMPT.md
    out: apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.PROMPT.md
    lang: md
    template: |
      # Demo Prompt (__COMPONENT__ / default-demo)

      - 目标：展示 __PASCAL__ 的最小使用方式
      - 重点：
        - 组件导入路径：`@/registry/default/__LAYER__/__COMPONENT__`
        - 渲染一个基础占位内容

  - path: apps/www2/content/docs/__LAYER__/__DOC_SLUG__.mdx
    out: apps/www2/content/docs/__LAYER__/__DOC_SLUG__.mdx
    lang: mdx
    template: |
      ---
      title: __COMPONENT__
      description: 自动生成的文档骨架
      ---

      <ExamplePreview
        componentName="__COMPONENT__"
        demoName="default-demo"
        description="默认示例"
      />

      ## 安装

      ```imd-add
      npx imd add __COMPONENT__
      ```

      ## 用法

      ```tsx
      import { __PASCAL__ } from '@/components/__LAYER__/__COMPONENT__'

      export default function Demo() {
        return <__PASCAL__ />
      }
      ```

  - path: apps/www2/registry/default/__LAYER__/__COMPONENT__/__tests__/index.test.tsx
    out: apps/www2/registry/default/__LAYER__/__COMPONENT__/__tests__/index.test.tsx
    lang: tsx
    slots:
      - name: tests
        type: ts
        desc: 覆盖更多测试用例
    template: |
      import * as React from 'react'
      import { render, screen } from '@testing-library/react'
      import { describe, expect, it } from 'vitest'

      import { __PASCAL__ } from '../index'

      describe('__PASCAL__', () => {
        it('renders children content', () => {
          render(<__PASCAL__>hello</__PASCAL__>)
          expect(screen.getByText('hello')).toBeInTheDocument()
        })
        /* @slot:tests */
      })
