---
id: imd-lib-basic
name: lib-basic
version: 1.0.0
description: 用于在 IMD 仓库下快速创建 lib 模块骨架（纯函数 + meta.json）
tags: [imd, lib, ts]

macros:
  __LIB_DIR__:
    desc: lib 目录名（kebab-case，形如 string 或 date-time）
    required: true
  __LIB_EXPORT__:
    desc: 默认导出函数名（camelCase，形如 formatString）
    required: true

templates:
  - path: apps/www2/registry/default/lib/__LIB_DIR__/index.ts
    out: apps/www2/registry/default/lib/__LIB_DIR__/index.ts
    lang: ts
    template: |
      /**
       * TODO: 描述 __LIB_EXPORT__ 的职责和使用场景。
       */
      export function __LIB_EXPORT__() {
        console.warn('[__LIB_EXPORT__] not implemented yet')
        return undefined as any
      }

  - path: apps/www2/registry/default/lib/__LIB_DIR__/meta.json
    out: apps/www2/registry/default/lib/__LIB_DIR__/meta.json
    lang: json
    template: |
      {
        "description": "__LIB_DIR__ lib 模块（自动生成骨架）",
        "tags": ["lib", "__LIB_DIR__"],
        "dependencies": [],
        "registryDependencies": []
      }
