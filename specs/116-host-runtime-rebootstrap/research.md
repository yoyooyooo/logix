# Research: Host Runtime Rebootstrap

## Decision 1: React package 继续保留包名，重组内部拓扑

- **Decision**: `@logixjs/react` 保留主包名，内部围绕 `provider / hooks / store / platform` 收口。
- **Rationale**: 包名本身已经贴近职责，问题主要在内部层级与旧心智。
- **Alternatives considered**:
  - 改包名。否决，原因是主语义并未失真。

## Decision 2: Sandbox 只围绕 `runtime.trial` 和受控环境

- **Decision**: `@logixjs/sandbox` 的主语义收紧为 trial surface、compiler、worker、受控环境和对齐实验场。
- **Rationale**: sandbox 不应再像第二套平台。
- **Alternatives considered**:
  - 继续让 sandbox 承担宽泛平台叙事。否决，原因是与当前 control plane 方向冲突。

## Decision 3: `@logixjs/test` 作为 control plane 附属测试层

- **Decision**: `@logixjs/test` 围绕 `TestRuntime / TestProgram / Assertions / Vitest` 收口。
- **Rationale**: 测试包应围绕统一验证主线，而不是自长独立 runtime。
- **Alternatives considered**:
  - 把测试能力继续散在各处。否决，原因是统一验收成本高。

## Decision 4: devtools 只消费统一观测契约

- **Decision**: `@logixjs/devtools-react` 只消费统一 snapshot / state / UI 契约，不自产第二套诊断事实源。
- **Rationale**: devtools 是观测器，不是事实源。
- **Alternatives considered**:
  - 让 devtools 自己维护推导状态。否决，原因是会制造第二真相源。

## Decision 5: 宿主切片与测试优先复用

- **Decision**: 对 provider、store、trial harness、snapshot state、现有 integration/browser tests 中已对齐目标契约的部分，优先复用或最小平移。
- **Rationale**: 宿主包重组主要是边界重排，不应默认放弃所有现有测试与切片。
- **Alternatives considered**:
  - 全量重写四个包。否决，原因是重复劳动过大。

## Decision 6: 第一轮先用直接 public API 测试固定宿主边界

- **Decision**: 不再通过 package-level surface contract 固定宿主边界；改为直接断言 `RuntimeProvider`、React platform bridge、`SandboxClient`、`runTest`、devtools snapshot adapter 的真实公开 API。
- **Rationale**: 这能避免只服务 spec/test 的中间层元数据继续滞留在源码里。
- **Alternatives considered**:
  - 直接在同一轮完成四个宿主包的全量目录重排。否决，原因是当前更适合先钉住边界合同。
