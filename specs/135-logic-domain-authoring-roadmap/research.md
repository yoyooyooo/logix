# Research: Logic Domain Authoring Convergence Roadmap

## Decision 1: 用一个总控 spec 承接这轮收口

- `setup/run`、fields、Form、Query、I18n 已经共享同一条北极星
- 若继续拆成互不关联的需求，scope 会再次漂移

## Decision 2: 子需求按互斥 primary scope 拆成四条

- `136` 只管核心相位合同
- `137` 只管 Form
- `138` 只管 Query
- `139` 只管 I18n

当前不把 `@logixjs/domain` 塞进现有四条。
若它被同一相位合同直接阻塞，另开新 spec，比污染现有 scope 更干净。

## Decision 3: 顺序固定为 `136 -> 137 -> 138/139`

- Form、Query、I18n 都依赖相位合同先稳定
- Form 分叉最多，优先级最高

## Decision 4: 这轮按 forward-only 执行

- 不保留兼容层
- 不保留弃用期
- 不保留双轨默认作者面
