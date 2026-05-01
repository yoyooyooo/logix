# Research: Domain Packages Second Wave

## Decision 1: `08` 的 future admission 需要独立 ledger

- 第一波更关注 existing packages
- 第二波要把 future package 规则显式化

## Decision 2: helper boundary 必须和 package role 一起判断

- 否则容易在 helper 里重新长出第二语义面

## Decision 3: `pattern-kit` 不再作为第三种 blessed 主输出

- future admission 只认 `service-first / program-first`
- `@logixjs/domain` 的 `pattern-kit` 只表示 package 组织形态
- 具体 kit 仍必须落到 program-first 主线
