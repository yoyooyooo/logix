# Research: Examples Verification Alignment

## Decision 1: 在现有 `examples/logix/src/` 之上重排

- **Decision**: 继续以现有 `features / patterns / runtime / scenarios` 为基础，再补 `verification` 子树。
- **Rationale**: 当前已有大量可复用样例，整体推倒会造成重复劳动。
- **Alternatives considered**:
  - 新开第二套 examples 目录。否决，原因是会制造第二入口。

## Decision 2: docs 锚点与 verification 锚点必须双向可达

- **Decision**: 每个主线 docs 页面都要能找到代表样例；每个 verification 示例也要能追溯对应 docs 页面。
- **Rationale**: dogfooding 与 verification 需要共用一套样例资产。
- **Alternatives considered**:
  - 只保留 docs -> example 单向链接。否决，原因是 verification 难以回写。

## Decision 3: verification 只认 `fixtures/env + steps + expect`

- **Decision**: examples 下的 verification 模板只围绕这三段组织。
- **Rationale**: 当前 control plane 已固定输入协议。
- **Alternatives considered**:
  - 让 scenarios 继续自由长出私有 DSL。否决，原因是会偏离统一验证面。

## Decision 4: 现有 scenarios / patterns 优先分类复用

- **Decision**: 先对现有 scenarios 和 patterns 做 keep / adapt / archive 分类，再决定新子树布局。
- **Rationale**: 很多现有样例已经能表达主线语义。
- **Alternatives considered**:
  - 全部重写。否决，原因是复用价值高。

## Decision 5: verification 子树先以最小 index + README 形式落地

- **Decision**: `examples/logix/src/verification/` 第一版先只落 `README.md` 和 `index.ts`，把 `fixtures/env + steps + expect` 模板钉住。
- **Rationale**: 当前先需要稳定入口与协议，不需要立即长出大量 verification 样例文件。
- **Alternatives considered**:
  - 一上来按每个 scenario 拆完整 verification 子目录。否决，原因是会放大当前收口面。
