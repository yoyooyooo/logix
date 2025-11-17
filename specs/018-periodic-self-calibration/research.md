# 018 定期自校准 · Research

本文件用于把“实现需要拍板的取舍”固化为可交接的结论（Decision / Rationale / Alternatives）。

## Decision 1：两级默认值：库侧审计驱动默认值演进，用户侧自校准生成本机覆盖

- Decision：
  - **库侧**：定期运行“默认值审计”，产出“是否建议更新库内置默认值”的可审查建议与证据；默认值更新需人工审阅后进入发布流程（不做黑盒自动发布）。
  - **用户侧（应用开发者 opt-in）**：运行时自校准默认关闭，仅在应用开发者显式启用后运行；只产出“应用侧默认覆盖（Provider / runtime options）”，不直接修改库内置默认值；并提供一键回退。
- Rationale：
  - 库默认值需要随版本演进保持合理，但必须以可复现证据与稳定性门槛约束，避免“拍脑袋改默认”。
  - 终端用户环境差异（硬件/电量/浏览器/温控）会导致本机最优值不同；因此用户侧应以覆盖方式生效并可回退、可审计。
- Alternatives：
  - 把用户侧结果直接写进库默认值：会把设备差异与波动放大成全体用户风险（Rejected）。
  - 库侧审计结果自动改默认并自动发布：缺少人工闸门，风险不可控（Rejected）。

## Decision 2：校准的工作负载分层：Synthetic 为主，UI 为辅

- Decision：校准优先以可在 Worker 执行的 synthetic workload（converge steps bench）做主评估；真实 UI workload 作为“主线程可用时的补充确认”，并在证据中标注是否覆盖了 UI 样本。
- Rationale：真实 UI 需要主线程与 DOM/React commit，无法可靠迁移到 Worker；但 pure compute 的 converge bench 可在 Worker 稳定运行且成本可控。分层策略能同时满足“尽量不打扰交互”和“尽量贴近真实”的目标。
- Alternatives：
  - 全部在主线程跑 UI：对交互影响不可控（Rejected）。
  - 全部在 Worker 跑：无法覆盖真实 UI 的 commit 行为（Rejected）。

## Decision 3：候选空间仅覆盖 013 控制面 converge 相关旋钮

- Decision：本期候选仅包含：
  - `traitConvergeMode`: `auto` / `full`
  - `traitConvergeBudgetMs`（executionBudgetMs）
  - `traitConvergeDecisionBudgetMs`（decisionBudgetMs）
  - （可选）按 `moduleId` 粒度覆盖
- Rationale：这些旋钮已有明确证据字段（`traitSummary.converge.*`）与止损语义（`outcome/reasons`），且已在 017 实验场具备人机可读口径；扩展到“缺少证据字段/语义不清”的参数会导致不可解释与不可审计。
- Alternatives：
  - 扩大到更多内置参数：会引入口径漂移与不可解释结论（Deferred）。

## Decision 4：搜索策略采用“保守的两阶段 + 稳定性阈值”

- Decision：
  1. 以 baseline（builtin 或当前默认覆盖）为参照，评估候选集合，硬门优先：`outcome=Degraded` 直接淘汰。
  2. 以 `commit wall-time` 的 median/p95 作为主指标，要求候选相对 baseline 同时满足“非回归 + 稳定性阈值内波动”才可进入推荐池。
  3. winner 需至少复跑 N 次（例如 3）确认一致性；若无法稳定复现则不产出推荐或保持 baseline。
- Rationale：自校准的价值在于“证据驱动的默认值”，因此必须优先保证安全与可解释，而不是追求极限最优。
- Alternatives：
  - 复杂 bandit/贝叶斯优化：收益与实现成本不匹配，且可解释性更差（Deferred）。

## Decision 5：调度与触发：显式 + 合并去抖 + 周期 TTL

- Decision：
  - **库侧审计**：按固定周期运行（例如每周/每次大版本发布前），并在关键改动后可手动触发；必要时在多个代表性环境上复跑（以降低“只对单机有效”的误判风险）。
  - **用户侧自校准**：触发来源包含：显式触发、版本变化、环境变化、TTL 到期；同时提供节流与合并：短窗口内多次触发只合并为一次，且可取消/可暂停。
- Rationale：避免后台持续高负载；把“需要校准”的信号显式化并可解释，才能形成可审计链路。
- Alternatives：
  - 始终后台循环校准：成本不可控且难以解释（Rejected）。

## Decision 6：持久化与可导出：localStorage + 结构化 JSON

- Decision：
  - **库侧审计**：产物以结构化 JSON/Markdown 形式保存（CI artifact 或仓库内 perf 目录），用于回归对比与发布审阅。
  - **用户侧自校准**：默认用 localStorage 保存 policy 快照、最近一次 recommendation 与有界历史（ring buffer）；并支持导出为 JSON 文件；导出物 schema 固化在 `contracts/`。
- Rationale：最小可用、跨环境易读，便于人和 LLM 消费；避免引入额外存储依赖。
- Alternatives：
  - IndexedDB：更强但复杂度更高（Deferred）。

## Decision 7：交互保护：Worker First，必要时主线程 idle 切片并可暂停

- Decision：校准默认在 Worker 执行（Worker First），且默认只跑 synthetic workloads（避免主线程 State Sync 与 DOM 依赖）。需要主线程的 UI/DOM 样本确认时，必须在 idle 窗口分片运行，并在交互活跃时暂停/让步；并在证据中标注“这是主线程 UI 样本”，避免与 Worker 结果混为同一结论。
- Rationale：满足“对主线程无可感知影响”的目标；同时保留对 UI 样本的最小覆盖。
- Alternatives：
  - 仅用 `setTimeout`：不可控且容易造成抖动（Rejected）。

## Decision 8：Workload 逻辑抽取为单一事实源（支持 Worker 复用）

- Decision：把 014 的 workload 逻辑构造器抽取为单一事实源模块：`packages/logix-react/src/internal/perfWorkloads.ts`，并让 014/017/018 统一引用（internal，不作为 public API）。
- Rationale：
  - Worker 复用需要 workload 的“逻辑构造”可脱离 React/DOM；抽取后可以在 Node/browser/Worker 复用同一套逻辑，避免 018 自校准复制一份 workload 导致口径漂移。
  - 014 是证据口径的事实源；workload 也应做到“可复用、可定位、可追溯”。
- Alternatives：
  - 保持 inline：会导致 018/017 复用困难与口径漂移（Rejected）。
  - 复制粘贴到 018：短期快，但会形成并行真相源（Rejected）。

## Decision 9：State Hydration Strategy：避免主线程 Structured Clone 卡顿

- Decision：
  - Worker 校准的默认 workload 不依赖业务 State（synthetic 为主），以避免主线程在 `postMessage` 时进行大对象 structured-clone 的同步阻塞。
  - 若确需在 Worker 中运行“贴近业务”的 workload，必须显式声明 hydration 策略并保证主线程同步开销可控：优先发送最小 slice 或 action log；大二进制数据必须使用 Transferable；否则降级为主线程 idle 切片或跳过该 workload。
- Rationale：structured-clone 发生在主线程且同步阻塞；一旦 State 体积较大，会造成一次性明显掉帧，抵消“Worker 隔离 + Fiber 可中断”的收益。
- Alternatives：
  - 直接发送全量 State：风险不可控（Rejected）。
  - 使用 SharedArrayBuffer/Atomics 等共享内存：实现复杂且约束较多（Deferred）。
