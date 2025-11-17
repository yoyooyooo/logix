---
id: imd-hook-basic
name: hook-basic
version: 1.0.0
description: 用于在 IMD 仓库下快速创建可复用 Hook（含最小实现与可选 meta）
tags: [imd, hook, react, ts]

macros:
  __HOOK_FILE__:
    desc: Hook 文件名（kebab-case，形如 use-copy）
    required: true
  __HOOK_EXPORT__:
    desc: 导出名（camelCase，形如 useCopy）
    required: true

templates:
  - path: apps/www2/registry/default/hooks/__HOOK_FILE__.tsx
    out: apps/www2/registry/default/hooks/__HOOK_FILE__.tsx
    lang: tsx
    template: |
      'use client'

      import * as React from 'react'

      interface __HOOK_EXPORT__Options {
        // TODO: 配置项
      }

      interface __HOOK_EXPORT__Return {
        // TODO: 返回值
      }

      /**
       * TODO: 描述 __HOOK_EXPORT__ 的职责和使用场景。
       */
      export function __HOOK_EXPORT__(options: __HOOK_EXPORT__Options = {}): __HOOK_EXPORT__Return {
        console.warn('[__HOOK_EXPORT__] not implemented yet', options)
        return {} as __HOOK_EXPORT__Return
      }

  - path: apps/www2/registry/default/hooks/__HOOK_FILE__.meta.json
    out: apps/www2/registry/default/hooks/__HOOK_FILE__.meta.json
    lang: json
    template: |
      {
        "description": "__HOOK_FILE__ Hook（自动生成骨架）",
        "tags": ["hook"],
        "dependencies": [],
        "registryDependencies": []
      }
