# Research: O-009 ReadQuery 严格门禁前移到构建期

## Decision 1: 严格门禁主判定前移到构建期

- **Decision**: 把 strict gate 的主判定从运行时迁移到 module/logic 编译期，运行时仅消费判定结果。
- **Rationale**:
  - 热路径减少治理分支，避免每次订阅时重复 rule 匹配。
  - 门禁失败可在 CI 构建阶段被阻断，反馈更早。
  - 构建产物可作为跨环境统一事实源。
- **Alternatives considered**:
  - 保持运行时判定不变，仅做缓存：仍需热路径分支，收益有限。
  - 完全取消 strict gate：失去治理能力，不符合 NS-3。

## Decision 2: 以“质量报告 + 运行时消费记录”形成双侧证据

- **Decision**: 新增 `SelectorQualityReport`（构建期）与 `ReadQueryRuntimeConsumptionRecord`（运行时）两个最小证据面。
- **Rationale**:
  - 构建期负责裁决，运行时负责执行与回放锚点。
  - 能在 Devtools/CI 同时追踪“为何通过/为何降级”。
- **Alternatives considered**:
  - 只保留构建报告：运行时缺少消费证据，难定位实际路径。
  - 只保留运行时诊断：无法做到前移门禁。

## Decision 3: 运行时未定级 selector 必须显式降级

- **Decision**: 对未携带构建定级信息的 selector，不做隐式“当场补判”；走显式降级策略并输出稳定原因码。
- **Rationale**:
  - 防止“看似启用 build gate，实则运行时偷偷回退”的治理失效。
  - 为迁移阶段提供可审计清单（哪些 selector 尚未被编译定级）。
- **Alternatives considered**:
  - 自动在运行时重新完整判定：与 O-009 目标冲突。
  - 直接抛错：迁移成本过陡，不利于分阶段推进。

## Decision 4: fallbackReason 继续冻结枚举并统一 schema

- **Decision**: 延续并强制枚举口径，新增原因码必须同步到 schema/测试/文档。
- **Rationale**:
  - 防止构建期与运行时出现不同自由字符串。
  - 保证诊断可聚合、可统计、可门禁。
- **Alternatives considered**:
  - 允许自由字符串：短期灵活，长期不可治理。

## Decision 5: 通过“模块拆分 + 行为等价测试”控制重构风险

- **Decision**: 将构建门禁逻辑抽离到独立模块，配套新增 build-time 与 runtime-consumption 回归测试。
- **Rationale**:
  - 避免 `ReadQuery.ts` 继续扩张并混入双阶段逻辑。
  - 测试可分别验证“判定正确性”和“运行时简化后行为等价”。
- **Alternatives considered**:
  - 在 `ReadQuery.ts` 内原地增量改造：实现快但可维护性差，回归面更难控。

## Open Questions Resolved

- Q: 构建期门禁失败是否允许跳过？
  - A: 由 `mode` 决定；`error` 阻断、`warn` 允许但记录报告。
- Q: 运行时是否仍支持动态 selector？
  - A: 支持，但必须走显式降级并具备稳定原因码。
- Q: 是否引入兼容层？
  - A: 不引入；采用 forward-only 迁移说明。
