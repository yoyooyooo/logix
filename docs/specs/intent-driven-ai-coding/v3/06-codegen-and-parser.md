---
title: 06 · 全双工引擎：锚点与类型投影 (The Full-Duplex Engine)
status: draft
version: 4 (Clean-Mode-Added)
---

> **核心目标**：实现 Intent (图) 与 Code (码) 的**无损双向同步 (Lossless Round-trip)**。即使代码被人工修改，意图结构依然保持完整，且平台具备 IDE 级的类型安全。

## 1. 核心理念：锚点系统 (The Anchor System)

为了解决“代码熵增”导致无法解析的问题，我们不再试图理解任意代码，而是依赖**确定性的 AST 锚点**。

### 1.1 锚点定义

Generator 在生成代码时，会注入结构化的元数据标记（通过注释或 Decorator）。

```typescript
// 示例：生成的代码片段

// @intent-start: logic:node-123 { "type": "service-call", "hash": "a1b2c3d4" }
const user = yield* UserService.get(payload.id);
// @intent-end: logic:node-123

// @intent-start: logic:node-456 { "type": "branch" }
if (user.vip) {
  // @intent-slot: then
  yield* Analytics.track('vip_login');
}
// @intent-end: logic:node-456
```

*   **ID**: 唯一标识 Intent 节点。
*   **Hash**: 内容指纹，用于检测代码是否被人工修改。
*   **Slot**: 标识容器节点的插槽位置。

### 1.2 解析策略 (Parsing Strategy)

Parser 的工作流从“理解代码”转变为“识别锚点”：

1.  **Scan**: 扫描文件中的 `@intent-start` 和 `@intent-end` 标记。
2.  **Verify**: 计算锚点内部代码的 Hash，与标记中的 Hash 比对。
3.  **Reconstruct**: 
    *   **Match**: Hash 一致，直接映射回 Intent 节点，属性面板可编辑。
    *   **Mismatch (Dirty)**: Hash 不一致，标记为 **"Ejected Block" (逃逸块)**。

### 1.3 逃逸策略 (Ejection Strategy)

当检测到人工修改（Hash Mismatch）时：

*   **图层表现**：节点依然存在，连接关系保留。
*   **交互限制**：该节点的属性面板被锁定，显示“已在代码中修改”。
*   **可视化增强**：
    *   **White Box**: 标准节点，完全可视化。
    *   **Gray Box (Ejected)**: 结构已知（如依然是 Service Call），但参数被改动。允许“重置回标准”或“保留修改”。
    *   **Black Box (Raw)**: 完全无法识别的代码块，作为 Raw Node 存在。

### 1.4 生成模式 (Generation Modes)

Generator 支持两种输出模式，以适应不同的交付场景：

| 模式 | 描述 | 适用场景 | 特征 |
| :--- | :--- | :--- | :--- |
| **Duplex Mode** (默认) | 生成包含完整锚点注释的代码。 | **持续迭代**。需要平台与本地代码保持长期同步。 | 代码中包含 `@intent` 标记。 |
| **Clean Mode** | 生成无任何元数据的纯净代码。 | **一次性交付 / 脚手架**。生成后即脱离平台，由开发者接管维护。 | 代码极其干净，无任何平台痕迹。 |

> **注意**：一旦使用 Clean Mode 导出并修改，该文件将**无法**再无损回流到平台（除非手动补全锚点，但这极难）。这是一种“单向桥”。

## 2. 类型投影 (Type Projection)

为了在 Web 画布上实现“强类型”体验，平台必须将 Domain Intent 实时投影为浏览器的类型定义。

### 2.1 虚拟文件系统 (Virtual FS)

浏览器端的编辑器 (Monaco) 挂载一个虚拟文件系统。平台后端负责实时编译：

*   **Input**: Domain Intent (JSON Schema / Database)
*   **Process**: `Schema -> TypeScript AST -> .d.ts String`
*   **Output**: 注入到 Monaco 的 `extraLibs` 中。

### 2.2 开发者体验 (DX)

1.  **自动补全**：在 Builder 中输入 `UserService.` 时，自动列出 `update` 方法。
2.  **实时校验**：参数类型错误时，画布上的代码块直接标红。
3.  **重构支持**：修改 Domain 实体名，所有引用的 Logic Flow 自动报错或重构。

## 3. 架构分层

### Phase 1: Web-Based Isomorphic Engine

*   **Environment**: Browser Worker
*   **Tools**: `ts-morph` (Web Build), `monaco-editor`
*   **Flow**: 
    1.  Intent JSON -> Generator -> TS Code (with Anchors)
    2.  TS Code -> Parser -> Anchor Tree -> Intent JSON

### Phase 2: CLI Synchronization

*   **Tool**: `@intent/cli`
*   **Watch Mode**: 监听本地文件变更，提取锚点信息，通过 WebSocket 推送给 Web 端。
*   **Conflict Resolution**: 当本地代码与云端 Intent 冲突时，以**本地代码**为真理来源 (Code First)，更新云端图结构。

## 4. 总结

通过 **锚点系统** 和 **类型投影**，我们实现了：
1.  **代码可读性**：生成的代码依然是干净的 Effect 代码，只是多了注释标记。
2.  **双向无损**：无论怎么改代码，图结构不会崩塌。
3.  **极致 DX**：Web 端拥有与 VSCode 一致的类型能力。
