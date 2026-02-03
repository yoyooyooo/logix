# 10. IR Reflection & Trial Run（可对比产物）

- **runId（RunSession id）**
  - 指一次试跑/证据导出的会话标识（跨进程可复用，用于 diff 与并行隔离）；
  - 与 runtime 实例标识 `instanceId` 必须分离：`runId` 属于“会话”，`instanceId` 属于“实例”。

- **RunSession**
  - 运行期证据导出的会话上下文（runId/source/startedAt + 本地 seq/once 状态）；
  - 目标：让事件序列（Dynamic Trace）在同一会话内可关联、可裁剪、可回放。

- **Manifest IR / ModuleManifest**
  - 面向平台/CI 的模块结构摘要（JSON，可 diff）；
  - 必须可 `JSON.stringify`；不得包含 Schema/闭包/Effect 本体；
  - 覆盖 `actions/effects/schemaKeys/logicUnits/servicePorts` 等结构字段；
  - `digest` 只由结构字段决定（不含 meta/source），用于 CI 降噪与快速对比。

- **Static IR / StaticIR**
  - 声明式 traits 的静态依赖图（JSON，可 diff）；
  - canonical 形态复用 `StateTrait.exportStaticIr`（version/moduleId/digest/nodes/edges/...）。

- **Trial Run（受控试运行）**
  - 在 Build Env 中对 module 做一次受控启动窗口，用于提取 Environment IR 与证据；
  - 语义上只覆盖 module boot + scope close，不执行业务 main。

- **TrialRunReport**
  - Trial Run 的可序列化输出体（JSON，可存档）；
  - 核心字段：`ok/error` + `environment`（依赖观测摘要）+ `servicePortsAlignment?`（端口级缺失定位）+ `evidence`（可选事件序列与控制面摘要）。

- **Environment IR / EnvironmentIr**
  - Trial Run 过程中观测到的依赖集合（best-effort）与违规摘要：
    - `tagIds/configKeys`：观测集合
    - `missingServices/missingConfigKeys`：缺失依赖摘要（必须可行动）

- **Control plane evidence / RuntimeServicesEvidence**
  - 控制面证据（bindings/overridesApplied/scope），用于解释“为什么选了某个 impl”；
  - 必须复用统一协议，避免平台另起第二套真相源。

- **TrialRunTimeout / DisposeTimeout**
  - Trial Run 的两段超时口径：
    - 试跑窗口超时 → `TrialRunTimeout`
    - 释放收束超时（语义复用 024 closeScopeTimeout）→ `DisposeTimeout`

- **MissingDependency / Oversized / RuntimeFailure**
  - Trial Run 常见失败类别：
    - `MissingDependency`：构建态缺失服务/配置（报告必须带缺失清单）
    - `Oversized`：输出体积超预算（提示调小 maxEvents / budgets）
    - `RuntimeFailure`：其它运行时失败（兜底）
