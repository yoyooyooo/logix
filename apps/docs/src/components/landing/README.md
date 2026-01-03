# Landing 组件（apps/docs）

约束（硬约束）：

- 颜色：只使用 tokens（CSS variables）及其派生；禁止硬编码颜色与任意色值。
- 组件：基础 UI 只使用 shadcn/ui（`src/components/ui/*`）；业务层只组合，不自造基元。
- 禁止：backdrop blur / backdrop filter、`0 0 Npx` glow 阴影。
- 动效：只用 Framer Motion，并尊重 reduced-motion。

Sections（SRP：一段只做一件事）：

- `HeroSection`：首屏价值主张 + CTA
- `WordmarkLabSection`：Logix 字标候选（字体/强调/动效）供挑选
- `NextStepsSection`：三个文档入口
- `TimeTravelSection`：可观测/回放能力示意
- `FeaturesSection`：核心能力网格
- `FAQSection`：常见问题（Accordion）
- `FinalCTASection`：末尾收口 CTA

输入数据：

- `content.ts`：唯一文案/结构配置源（按 `lang` 选择）。
