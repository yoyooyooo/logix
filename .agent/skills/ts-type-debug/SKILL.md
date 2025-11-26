---
name: ts-type-debug
description: This skill should be used when inspecting or debugging TypeScript types in a local project, especially to understand the inferred A/E/R of an Effect or the shape of a complex generic type in a specific file.
---

# TS Type Debug

## Overview

Use this skill to inspect and debug TypeScript types in a local project by running a small `ts-morph`-based script via `npx tsx` **inside the skill directory**.  
The goal is to quickly see the fully-resolved type for a symbol (variable, function, type alias) in a given `.ts`/`.tsx` file, without反复猜类型或到处改代码。

## Quick Start

要查看某个符号的实际类型：

1. 确定目标文件路径和符号名  
   - 例如：文件 `src/logic/approval.ts`，符号 `ApprovalLogic`。
2. 在 skill 目录（例如 `.agent/skills/ts-type-debug`）的 `scripts/` 下创建/更新 `inspect-types.ts`（参考下文模板）。  
3. 在 skill 根目录运行：
   ```bash
   npx tsx scripts/inspect-types.ts ../../src/logic/approval.ts ApprovalLogic --tsconfig ../../tsconfig.json
   ```
4. 在终端输出中查看打印出的完整类型字符串。

前提假设：
- Skill 自身安装了 `ts-morph` / `tsx` / `typescript` 依赖；  
- 调用时 `cwd` 为 skill 根目录（例如 `.agent/skills/ts-type-debug`）；  
- 通过 `--tsconfig` 将主项目的 `tsconfig.json` 路径传进来。

## Standard Workflow

1. **Lock the Target**  
   - 明确要看的到底是什么类型：  
     - 某个值的类型：`typeof SomeValue`  
     - 某个别名（例如 `MyFx`）展开后的具体形态  
     - 某个 `Effect.Effect<A, E, R>` 的三通道是否符合预期。

2. **Prepare the Inspection Script**  
   - 在 skill 的 `scripts/inspect-types.ts` 中：
     - 使用 `ts-morph` 的 `Project` 读取 tsconfig；  
     - 基于 `tsConfigFilePath` 创建 Project；  
     - 用 `getSourceFile` / `getVariableDeclaration` / `getFunction` / `getTypeAlias` 找到目标符号；  
     - 调用 `getType().getText()` 打印类型。

3. **Run via `npx tsx`（从 skill 根目录）**  
   ```bash
   npx tsx scripts/inspect-types.ts <filePath> <symbolName> [--tsconfig path/to/tsconfig.json]
   ```

4. **Interpret the Output**  
   - 重点关注：
     - `Effect.Effect<A, E, R>` 三个泛型的推导情况；  
     - Env 是否是 `Store.Runtime & Services` 之类的交叉；  
     - 是否出现了意外的 `any` / `unknown` / 过宽的联合。

5. **Tighten Types Based on Feedback**  
   - 根据检查结果调整泛型签名、别名或 helper；  
   - 再次运行脚本验证新设计是否符合预期。

## scripts/inspect-types.ts Template

在 skill 目录（如 `.agent/skills/ts-type-debug`）的 `scripts/` 下创建 `inspect-types.ts`，采用如下结构：

```ts
#!/usr/bin/env tsx
/**
 * Print the TypeScript type of a symbol in a given file using the compiler API.
 *
 * Usage:
 *   npx tsx scripts/inspect-types.ts <filePath> <symbolName> [--tsconfig path/to/tsconfig.json]
 */

import { Project } from 'ts-morph';
import path from 'node:path';

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: inspect-types <filePath> <symbolName> [--tsconfig path/to/tsconfig.json]');
    process.exit(1);
  }

  const filePathArg = args[0];
  const symbolName = args[1];
  const tsconfigFlagIndex = args.indexOf('--tsconfig');
  const tsconfigPath =
    tsconfigFlagIndex !== -1 && args[tsconfigFlagIndex + 1]
      ? args[tsconfigFlagIndex + 1]
      : 'tsconfig.json';

  const rootDir = process.cwd();
  const tsconfigFilePath = path.resolve(rootDir, tsconfigPath);
  const filePath = path.resolve(rootDir, filePathArg);

  const project = new Project({
    tsConfigFilePath: tsconfigFilePath,
  });

  const source = project.getSourceFile(filePath);
  if (!source) {
    console.error('Source file not found:', filePath);
    process.exit(1);
  }

  let found = false;

  const varDecl = source.getVariableDeclaration(symbolName);
  if (varDecl) {
    found = true;
    console.log(`Type of ${symbolName}:`);
    console.log(varDecl.getType().getText());
  }

  if (!found) {
    const funcDecl = source.getFunction(symbolName);
    if (funcDecl) {
      found = true;
      console.log(`Type of ${symbolName}:`);
      console.log(funcDecl.getType().getText());
    }
  }

  if (!found) {
    const typeAlias = source.getTypeAlias(symbolName);
    if (typeAlias) {
      found = true;
      console.log(`Type of ${symbolName}:`);
      console.log(typeAlias.getType().getText());
    }
  }

  if (!found) {
    console.error(`Symbol ${symbolName} not found in ${filePath}`);
    process.exit(1);
  }
}

main();
```

> 实际项目里可根据需要扩展：支持 class / interface / enum 等节点类型，或增加更多输出格式。

## When to Use This Skill

- 需要确认某个复杂泛型（尤其是 `Effect.Effect<A, E, R>`）的实际推导结果时；  
- 希望检查某个 Logic（例如 `ApprovalLogic`、`JobLogic`）的错误通道 E 与环境 R 是否按设计收敛；  
- TypeScript 错误信息难以理解，希望先看到某个符号的完整类型再反推签名设计。

## How This Skill Fits into the Workflow

- 在常规 `pnpm typecheck` / `tsc --noEmit` 流程之外，对关键逻辑做抽样类型检查；  
- 在重构 Store / Logic / Flow / Service 契约时，用此脚本验证新签名是否实现了预期的 A/E/R 结构；  
- 在调试 LLM 生成的 TypeScript 代码时，用它辅助发现隐藏的 `any/unknown` 并指导下一轮修改。  
- 如果运行脚本时报缺依赖错误（如找不到 `ts-morph` 或 `tsx`），先执行：
  ```bash
  cd .agent/skills/ts-type-debug
  pnpm install   # 或 npm install
  ```
