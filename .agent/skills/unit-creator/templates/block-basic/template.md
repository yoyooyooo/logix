---
id: imd-block-basic
name: block-basic
version: 1.0.0
description: 用于在 IMD 仓库下快速创建 Block 区块骨架（只负责 registry/源码落点，Block 内部结构由业务决定）
tags: [imd, block, ui, template]

macros:
  __BLOCK_NAME__:
    desc: Block 目录名（kebab-case，形如 form 或 page-list）
    required: true
  __BLOCK_COMPONENT__:
    desc: Block 导出组件名（PascalCase，形如 FormBlock）
    required: true

templates:
  - path: apps/www2/registry/default/blocks/__BLOCK_NAME__/index.tsx
    out: apps/www2/registry/default/blocks/__BLOCK_NAME__/index.tsx
    lang: tsx
    template: |
      'use client'

      import * as React from 'react'

      /**
       * TODO: 描述 __BLOCK_COMPONENT__ 的职责和页面场景。
       *
       * Block 建议只做拼装：内部通过 UI/Pro 组件、hooks、lib 组合业务界面，
       * 外部通过 props 注入数据源与回调，避免直接依赖业务 store。
       */
      export function __BLOCK_COMPONENT__() {
        return (
          <div
            data-block="__BLOCK_NAME__"
            className="flex h-full w-full flex-col gap-4 p-6"
          >
            TODO: 实现 __BLOCK_COMPONENT__
          </div>
        )
      }

  - path: apps/www2/registry/default/blocks/__BLOCK_NAME__/meta.json
    out: apps/www2/registry/default/blocks/__BLOCK_NAME__/meta.json
    lang: json
    template: |
      {
        "description": "__BLOCK_NAME__ block（自动生成骨架）",
        "tags": ["block", "__BLOCK_NAME__"],
        "dependencies": [],
        "registryDependencies": []
      }

