---
title: 布局意图 · 网格线稿与 AI 布局生成
status: draft
version: v1
---

> 本文聚焦一个问题：在 AI 时代，前端开发者如何**快速、自由地表达页面布局意图**，让平台与 LLM 帮我们把「线稿」转成可落地的布局结构与代码，而不是再回到拖栅格/手写 HTML 的老路。

## 1. 问题重述：布局意图 vs 传统栅格

传统前端布局的表达方式大致有几种：

- 直接在代码里写：`div + flex/grid` + 一堆 class；
- 在 UI Builder 里拖拽 Row/Col，调 `span/offset`；
- 在设计工具（Figma）里画线框，然后开发者自己脑补结构。

这些方式的共同问题：

- **表达成本高**：开发者脑子里明明只是一张「粗略分区图」，却要立刻翻译成抽象的 `span=8/16`、`flex-1` 等技术细节；
- **复用困难**：布局意图无法以结构化方式沉淀，只能作为具体代码/设计稿的一部分，被动复用；
- **与模式/模板割裂**：布局往往先靠感觉拼出来，再去套模式，难以把“布局意图”直接映射到 Pattern/Template。

我们希望的形态是：

> 开发者只画一张“线稿级”的布局草图，平台把它解析成结构化布局意图（Layout Intent），再交给模式/模板/LLM 生成 HTML 结构和样式。

## 2. 布局意图的目标与边界

**布局意图（Layout Intent）要解决的，不是 Pixel 级美术问题，而是：**

1. 页面有几个“主要区域”？
2. 每个区域的大致位置与相对大小？（上/下/左/右、多列/单列）
3. 这些区域的语义是什么？（例如 filters / toolbar / table / metrics 等）

它**不负责**：

- 组件内部的微观布局（表单项如何对齐、按钮间距是多少）；
- 响应式所有细节（mobile 断点上每一个排列差异）；
- 动画/视觉风格（阴影、圆角、配色）。

这些内容应由 Pattern/Template + 设计系统接管。布局意图是**线稿**：只负责“大的块”和“它们叫什么”。

## 3. 网格线稿交互：n×m 矩阵 + 上色

### 3.1 基本构想

提供一个类似 Excel 的 n×m 网格：

- 比如 4×4 或 6×4（数量可配置，但必须克制）；
- 用户可以按住鼠标拖动，连续选中一个矩形区域，如同合并单元格；
- 松开后给这个区域上色（或自动分配颜色），并允许输入一个 label；
- 多个色块之间的边界自然形成页面的“分区线”。

示意：

- 顶部一整行色块 → header；
- 底下左 3/4 宽、右 1/4 宽 → 主内容 + 侧栏；
- 右下再切一小条 → 操作栏等。

### 3.2 线稿转结构化 Layout JSON

当用户完成上色并给区域命名后，平台可以做几步处理：

1. **识别色块**：
   - 将连续同色单元格合并为矩形区域：`(x, y, w, h)`；
   - 给每个区域一个 id 和 label：例如 `filters/table/metrics/sidebar` 等。

2. **构造布局树**：
   - 根据区域的上下/左右相邻关系，推断出一个布局树：

   ```json
   {
     "type": "vertical",
     "children": [
       { "slot": "header", "ratio": 1 },
       {
         "type": "horizontal",
         "children": [
           { "slot": "leftPane", "ratio": 3 },
           { "slot": "rightPane", "ratio": 1 }
         ]
       }
     ]
   }
   ```

3. **附加语义信息**：
   - 用户可为每个 slot 选择/输入语义标签：
     - `filters / toolbar / table / metrics / detail / sidebar / footer ...`
   - 系统把这些标签同步到 `Intent.scene.layout` 或 Pattern config 中：
     - 例如 list-page 场景下，将 `filters / toolbar / table` 与 Pattern 的 target 对齐。

4. **生成 Layout Intent**：
   - 形成一个 Layout Intent 对象：

   ```ts
   interface LayoutRegion {
     id: string
     label: string
     role: string // filters/table/toolbar/metrics...
     area: { x: number; y: number; w: number; h: number }
   }

   interface LayoutIntent {
     gridSize: { rows: number; cols: number }
     regions: LayoutRegion[]
     tree: LayoutNode // 上文推导出的 vertical/horizontal 树
   }
   ```

### 3.3 Layout Intent → Flex/Grid HTML

一旦有了 Layout Intent，后续 pipeline 可以有两层：

1. **规则层**（不用 LLM）
   - 根据 layout 树生成通用的 flex/grid 结构：
     - 垂直栈：`flex-col` + children；
     - 水平栈：`flex-row` + `basis-[ratio]`；
     - 也可以直接映射到 `grid-template-rows/cols`。
   - 生成一个语义 slot 组件骨架，例如：

   ```tsx
   export function LayoutShell({ filters, toolbar, table, metrics }: Props) {
     return (
       <div className="flex flex-col h-full">
         <div className="flex-none">{filters}</div>
         <div className="flex-none">{toolbar}</div>
         <div className="flex-1 overflow-auto">{table}</div>
       </div>
     )
   }
   ```

2. **LLM 层**
   - 输入：
     - Layout Intent（regions + tree + labels）；
     - 当前项目的布局规范（例如 preferred flex/grid 写法、breakpoints）；
     - 已选 Pattern（例如 list-page/workbench-layout）。
   - 输出：
     - 语义清晰的容器组件代码（命名、props、接口）；
     - 适配 Pattern/Template 所需的 slot 名称和 props；
     - 根据规范生成响应式建议（例如 sidebar 在移动端折叠到底部）。

这样，开发者只需画一次“色块线稿”，平台就能给出一套高度合理的布局 shell，而不必手撸所有栅格细节。

## 4. 为什么不复刻拖栅格，而要用网格线稿？

关键在于：**网格线稿是意图表达，而不是实现细节**。

### 4.1 拖 Row/Col 的问题

- 用户必须理解 12 栅格/24 栅格等抽象概念；
- 必须手动输入 span/offset 或拖到合适宽度；
- 一旦想调整布局，往往要重新调多个 Row/Col 的 span。

这是在直接操作“实现结构”，而不是表达“我想要什么分区”。

### 4.2 网格线稿的优势

- 用户只需要“看着画”——选中区域、上色、起名；
- 不需要记住任何栅格数字，视觉直觉即可；
- 网格粒度可以很粗（例如 4×4），刚好只表达相对大小，而不是像素。

**只要我们严格限制粒度与职责，这会比拖栅格更快，而不是多一个复杂工具。**

## 5. 与 Intent / Pattern / Plan 的关系

布局线稿不是一个孤立组件，它要嵌入到既有的 Intent / Pattern / Plan 流水线里。

### 5.1 Intent.scene.layout 的来源

当前 Intent 中的 `scene.layout` 是直接在 YAML 中手写区域：

```yaml
scene:
  type: list-page
  layout:
    regions:
      - id: filters
        label: 筛选区
        role: filter-bar
      - id: toolbar
        label: 工具栏
        role: actions
      - id: table
        label: 列表
        role: data-table
```

改造后：

- 这些 region 不再由开发者手写，而是由布局线稿工具生成；
- region 的 `area` 信息（x/y/w/h）只在内部用于推导 layout 树，可选是否持久化；
- `role` 与 Pattern 的 target 对齐，例如 `filters/table/toolbar` 对应 filter-bar/table-with-server-filter/toolbar-with-quick-edit。

### 5.2 Pattern 的布局参数

很多 Pattern（尤其是 layout 模式，如 `workbench-layout`）本身有自己的布局参数：

```yaml
paramsSchema:
  layoutMode:
    type: string
    enum: [two-column, three-row]
  leftPanelId:
    type: string
  rightPanelId:
    type: string
  metricsRegionId:
    type: string
```

布局线稿可以帮助：

- 自动为这些参数提供候选值（从 regions.id/role 中推导）；
- 提示“当前线稿与所选 Pattern 是否适配”（例如没有 metrics 区域但选择了 workbench-layout，就标黄）；
- 为 Pattern Studio 提供示例 layout（模式文档里可附上典型线稿）。

### 5.3 Template / Plan 的生成

Layout Intent + Pattern config 可以参与 Template → Plan 的决策：

- 根据布局树决定生成哪些容器组件、文件路径；
- 根据 slot role 决定哪些 Pattern 实例挂在哪个 slot 下；
- 根据 Layout Intent 提示开发者：某些区域未配置 Pattern/Template，是否补充。

最终 Plan 中的 `create-file` actions 可以明确说明每个文件对应哪个布局 slot。

## 6. UX 设计原则：要比写 HTML 快，否则就不要做

布局线稿工具成立的前提是：

> 表达布局意图的速度和清晰度，必须**显著优于**手写 HTML 或拖栅格，否则它只是一种“酷炫的多余”。

因此，在交互设计上需要非常克制：

### 6.1 控制网格分辨率

- 默认提供 4×4 或 6×4，足够表达“上/下/左右/大/小”；
- 不提供 24×24 级别的细粒度，以免用户陷入 Pixel 级调节；
- 如需更细控制，交给 Pattern/Template（例如 ProLayout、UI 库的 grid 组件），而不是线稿工具。

### 6.2 辅以简短语义输入

- 每个色块至少要有一个 `label`，并可选择 `role`；
- “只画不命名”会让 LLM 缺乏语义，生成意图的价值大打折扣；
- 建议提供常用 role 快捷按钮（filters/table/toolbar/metrics/sidebar/footer 等）。

### 6.3 立即看到“彩稿级”结果

- 在画布下方或右侧实时展示：
  - Layout Intent JSON 预览；
  - 生成的 React Layout Shell 代码 preview；
  - 对应 Pattern 参数自动填充情况（例如 workbench-layout 的 panelId）。
- 让用户在几秒钟内看到“我画的线稿已经变成了有 slot 的 Layout 组件”，否则会怀疑价值。

### 6.4 保留回退与微调

- 用户可以修改色块（拖动/扩展/拆分）并重新生成 Layout Intent；
- 生成的代码不应成为黑盒：
  - 平台保存“线稿 → Intent.scene.layout → LayoutShell 组件”之间的映射；
  - 当 Layout Intent 变更时，可以生成差异提示，而不是全量覆盖。

## 7. 与“高维画布”的关系

本方案只覆盖布局层面的线稿：

- 我们不在这个网格里表达所有行为/数据/代码结构；
- 行为 Flow、模块依赖图仍应有自己专属的可视化（小画布/图表）。

未来可以在更高层次提供“全局画布”：

- 布局线稿只是全局画布中的一个视图层（Layout Layer）；
- 行为 Flow Layer 叠加在其上（点击某块区域中的按钮，显示相关 Flow）；
- 代码结构 Layer 则展示此布局对应的组件树/目录结构；
- 但这些都建立在**各层线稿工具已经足够好用**的前提上。

## 8. 对现有规划与原型的影响

引入布局线稿后，我们需要对规划与原型做以下调整：

1. **Intent Studio 中增加 Layout 视图**：
   - 用网格线稿替代/补充 YAML 形式的 `scene.layout`；
   - 将区域 label/role 与 Pattern target 对齐；
   - Layout Intent 作为 Intent 的一部分保存。

2. **Pattern Studio 中增加 Layout 示例与适配提示**：
   - 对 layout 类模式（如 workbench-layout）展示典型线稿；
   - 对当前 Intent 的 Layout Intent 做适配性校验，并给出提示。

3. **生成控制台中展示 Layout Shell**：
   - 在 Plan 预览中，展示根据 Layout Intent 生成的 LayoutShell 组件；
   - 标明各 slot 对应的 Pattern/Template 绑定。

4. **文档层面**：
   - 明确区分布局意图、组件/交互意图、行为 Flow 意图、代码结构意图；
   - 布局线稿仅承担其中一层的表达责任。

## 9. 下一步 PoC 建议

为了验证这个设计是否比拖栅格/手写 HTML 更“有意义”，建议先做一个极简 PoC：

1. 在原型中增加一个简单的 4×4 网格画布：
   - 支持矩形选区、上色、label 输入；
   - 显示 Layout Intent JSON 预览。

2. 添加一个 LayoutShell 预览区：
   - 使用纯算法将布局树映射到 flex 布局；
   - 不引入 LLM，仅做规则层验证。

3. 再接入一次 LLM：
   - 将 Layout Intent + 当前项目的布局规范喂给 LLM；
   - 生成更语义化的 LayoutShell 代码（组件名、props 等）；
   - 对比人工写的布局代码，评估可读性与调整成本。

如果这个 PoC 的体验被认为“确实比拖栅格/手写 HTML 更快、更清晰”，再将其纳入 v1 的平台交互；否则宁可保留旧方式，也不要做一个华而不实的新玩具。

