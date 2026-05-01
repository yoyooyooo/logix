---
title: Verification Control Plane
status: living
version: 25
---

# Verification Control Plane

## 目标

统一静态自我验证与运行式自我验证，并把它们收敛为一套 AI Native、Agent First 的 `runtime control plane`。

这页在 Form supporting routing law 下只承接：

- verification control plane
- compare / digest / report coordinate
- control-plane admissibility

## 定位

- 验证能力统一挂在 `runtime.*`
- 它属于 `runtime control plane`
- 它不属于公开 authoring surface
- 它不反向长出新的业务建模入口
- 它的输入必须稳定、小而结构化
- 它的输出必须可机读、可比较、可修复

## 第一版正式主干

第一版正式主干只收这三类能力：

- `runtime.check`
- `runtime.trial`
- `runtime.compare`

当前覆盖矩阵的 frozen API shape 已消费这三类能力，统一看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)。其中 `runtime.compare` 只按 control-plane stage 冻结，额外 root productization 必须另走 runtime authority intake。

口径固定为：

- 小写 `runtime.check / runtime.trial / runtime.compare` 表示 control-plane stage family
- 已落地 public facade 写作 `Runtime.check(Program, options?)` 与 `Runtime.trial(Program, options)`
- `Runtime.run(Program, main, options)` 是 result face，不属于 control-plane stage family，也不返回 `VerificationControlPlaneReport`
- `runtime.compare` 当前只冻结为 control-plane stage；root `Runtime.compare` productization 必须另走 runtime authority intake

第一版暂不提升为正式主入口的能力：

- `replay`
- 宿主级深验证
- raw evidence 全量比较

这些能力后续可以继续存在，但当前只作为升级层或专项层，不进入第一版默认门禁。

## 分层验证模型

### 1. `runtime.check`

定位：

- cheap static gate

承接内容：

- 类型检查产出的 derived source artifact
- manifest / static IR
- build / static selector-quality artifact
- public surface diff
- contract diff
- 依赖与配置声明检查

硬边界：

- `runtime.check` 不拥有 TypeScript compiler、package resolver 或 raw source truth；它只消费 derived source artifact、declaration coordinate、digest 与 `sourceRef` pressure
- 不隐式代跑启动验证
- 不因 startup-only missing service/config/import 失败而产出 dependency finding；这些 failure 归 `runtime.trial(mode="startup")`
- 不隐式代跑行为验证
- 不隐式观察 React host commit、subscription fanout 或 component render isolation
- selector-quality 只允许以 static artifact ref / finding / repair hint 进入 `runtime.check` report；不得写入 host-harness、React commit、subscription fanout 或 render isolation 结论
- 任何需要启动、装配、依赖解析、资源关闭或行为执行的验证，都必须进入 `runtime.trial`

### 2. `runtime.trial`

定位：

- 运行式验证入口

第一版统一入口，显式区分：

- `mode: "startup"`
- `mode: "scenario"`

`startup` 承接：

- 能否正常装配
- 依赖是否齐全
- 配置是否齐全
- `$.readyAfter(...)` readiness requirement 是否能在启动阶段成功完成
- selector precision policy wiring 是否可被装配
- startup selector-quality artifact 是否可被解析
- startup selector-quality 只表示装配期 policy wiring 与 artifact 可解析性，不表示 host projection 已被浏览器证明
- 资源能否正常关闭
- 启动与关闭阶段是否出现明确运行时失败
- 启动阶段暴露的 broad / dynamic / dirty fallback policy 配置错误

`startup` 不承接：

- React component render isolation
- React subscription fanout
- host commit 计数
- 需要浏览器宿主交互的 selector commit 证据
- host-harness selector-quality evidence

### Readiness Evidence Boundary

`$.readyAfter(effect, { id?: string })` 是 public Logic authoring 的唯一 readiness contribution。verification control plane 只观察它在 startup trial 中形成的启动事实：

- requirement 在 declaration root 同步登记
- effect 在 runtime startup、instance env 下执行
- effect 成功后 instance 才可 ready
- effect 失败时 acquisition / startup trial 失败
- failure evidence 必须携带 module id、instance id、readiness id、phase 与可序列化 failure summary

`runtime.check` 不执行 readiness effect，也不根据 startup-only missing service/config/import 产出 dependency finding。需要 Effect DI、imports 或运行期装配才能暴露的 readiness failure 归 `runtime.trial(mode="startup")`。

verification control plane 不新增 public lifecycle authoring route。旧 `$.lifecycle.*`、`$.startup.*`、`$.ready.*`、`$.resources.*` 与 `$.signals.*` 只能作为 removed-public、internal-only、negative-only 或 archived 命中出现。

Agent 自验证终局压力矩阵看 [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)。装配漏加、缺 service、缺 config、缺 imports 与宿主 wiring 缺口，按该矩阵反压 runtime trial 和 report 结构化能力。

该矩阵压出的 core/kernel 实施需求落到 [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)。`09` 继续持有 stage、report、focusRef、compare 与 scheduling authority，`161` 只承接可实施 closure contract。

当前 canonical facade：

- `Runtime.trial(Program, options)`
- 当前公开类型口径统一写作 `TrialOptions`
- `TrialReport` 继续只允许作为 `VerificationControlPlaneReport` 的 pure alias
- 旧 observability 试跑 helper 已退出公开入口
- canonical `trial` 与 expert verification 共享的最小执行、证据、session primitive 统一下沉到 `internal/verification/**`
- 当前共享执行内核固定为 `internal/verification/proofKernel.ts`
- `internal/observability/trialRunModule.ts` 只保留 canonical route adapter 身份
- canonical adapter 的 `environment` 与 `error-mapping` 已进一步外提；`trialRunModule.ts` 当前只承接 route-entry、kernel boot/close 协调与 report/re-export 编排
- `Runtime.trial` 只承接 diagnostic run face；文档示例需要业务结果时进入 `Runtime.run`，不得把 Trial report 当 example result

`scenario` 承接：

- 在受控环境中执行声明式交互脚本
- 验证关键状态变化、关键证据摘要、关键工件与环境结果
- 在显式 host evidence artifact、`trial.scenario` 或 repo-internal host harness 产物存在时，验证 host projection precision、selector route 与 fallback policy

硬边界：

- `trial.scenario` 只服务验证
- `trial.scenario` 不承担当正式业务逻辑入口
- `trial.scenario` 不承当复用型运行时程序资产
- `trial.scenario` 不进入公开 authoring 主链
- 在 core-owned scenario executor 落地前，CLI `trial --mode scenario` 必须结构化失败，不能把 Playground product scenario playback 升级为 control-plane truth
- host projection precision report 只消费显式证据产物，不从 control plane 隐式采集 React render 或 subscription fanout

### Selector-Quality Evidence Layering

当前 selector route cutover 后，verification control plane 固定按阶段分层：

| layer | allowed stage / mode | allowed claim | forbidden claim |
| --- | --- | --- | --- |
| static selector-quality | `runtime.check` / `static` | static selector-quality artifact ref、read precision finding、repair hint | React commit、subscription fanout、render isolation、host-harness evidence |
| startup selector-quality | `runtime.trial` / `startup` | selector policy wiring 与 startup artifact 可解析性 | browser host interaction、component commit count、subscription fanout |
| scenario selector-quality | `runtime.trial` / `scenario` | 显式 scenario evidence 中的 selector route / fallback policy | 隐式浏览器探测、默认 raw trace 全量比较 |
| host-harness selector-quality | repo-internal host harness artifact | host projection precision、route decision、fallback evidence | 业务 authoring surface、默认 `runtime.check` 结论 |

`SelectorQualityArtifact` 是内部 evidence noun，不进入 public authoring vocabulary。公开用户文档继续只使用 selector input、broad read、dynamic fallback、dirty fallback 与 core route。

### stage coordinate matrix

验证控制面的共享坐标固定为三类：

- `declaration`
- `scenario plan`
- `evidence`

各阶段只消费自己需要的最小集合：

| stage | required coordinates | 说明 |
| --- | --- | --- |
| `runtime.check` | `declaration` | 只检查 declaration contract、schema、digest、public diff |
| `runtime.trial(mode="startup")` | `declaration + evidence refs` | 只验证装配、依赖、boot、close，不要求 scenario plan |
| `runtime.trial(mode="scenario")` | `declaration + scenario plan + evidence refs` | 在受控环境中执行声明式场景计划并采证 |
| `runtime.compare` | `declaration + scenario plan + evidence` | 用同一套坐标解释差异 |

这里的 owner 固定为：

- `declaration` 由对应 domain contract 持有
- `scenario plan` 由 runtime-owned compiled scenario plan 持有
- `evidence` 由 canonical evidence envelope 与其 summary 持有

### Hot lifecycle evidence

Hot lifecycle evidence is carried by the existing canonical evidence envelope.

- Event type: `runtime.hot-lifecycle`
- Decision set: `reset | dispose`
- Required payload coordinates: owner id, lifecycle event id, cleanup id, previous runtime instance id, optional next runtime instance id, cleanup status, resource summary, residual active count
- Optional host payload: host cleanup summary for React-owned binding cleanup
- Evidence producer: runtime internals receive lifecycle owner, registry, and evidence services from the host dev lifecycle carrier through Effect DI or an equivalent internal layer boundary
- It does not create a second HMR report protocol.
- It does not create a new `runtime.*` root command.
- Browser HMR evidence artifacts must map their evidence back to this envelope.
- Example-visible lifecycle helpers are not valid closure evidence for this feature. Closure evidence must show normal example authoring code plus host dev lifecycle carrier activation.
- Production import checks must prove dev lifecycle carrier modules are absent unless a dev-only entrypoint, conditional export, or equivalent static boundary is imported.

`runtime.hot-lifecycle` is an evidence event shape, not an authoring surface.

对 `runtime.trial(mode="scenario")`，当前进一步固定：

- scenario execution carrier 由 `ScenarioCompiledPlan + ScenarioRunSession` 组成
- carrier 只产内部 producer feed，不产 compare-ready normalized summary
- evidence summary、digest、diff、focusRef 继续归 evidence / compare owner

### VOB-01 scenario carrier evidence boundary

`VOB-01` 当前接受的 authority 边界只到 verification control plane：

- `fixtures/env + steps + expect` 可以编译到 runtime-owned compiled scenario plan
- compiled plan 可以把内部 producer feed 写入 canonical evidence envelope
- `expect` 可以读取 `EvidencePackage.events` 做声明式验证
- scenario carrier feed 只属于 verification internal substrate
- scenario carrier feed 不进入公开 authoring surface
- scenario carrier feed 可以承接由 Form evidence artifact `bundlePatchPath` 派生出的 `bundlePatchRef`，但不得泄漏 `sourceReceiptRef / keyHashRef / sourceSnapshotPath` 等 domain receipt coordinate
- expectation evaluator 不拥有 compare truth
- expectation evaluator 不写 `EvidencePackage.summary`
- report summary、digest、diff、focusRef 继续由 evidence / compare owner 承接

当前 verification implementation vocabulary 状态：

- `ScenarioCarrierEvidenceFeed`
- `ScenarioCompiledPlan`
- `ScenarioRunSession`
- `ScenarioStepFixture` remains test-fixture proof vocabulary only; trace ref: `TASK-006`
- `ScenarioExpectationEvaluation` remains test-fixture proof vocabulary only; trace ref: `TASK-006`

这些名称不得因为当前 proof 通过而自动冻结为最终 implementation vocabulary。任何后续复用必须先通过 verification artifact lifecycle review，并证明它仍然不新增 public authoring surface、compare truth、第二 report truth 或第二 evidence envelope。`TASK-006` 已把 scenario adapter、expectation evaluator、reason-link fixture 与 compare/perf admissibility helper 降到 test fixture/support；生产 `src/internal/verification` 当前只保留 retained harness。

当前不接受：

- 完整 scenario step language
- 完整 expectation language
- public `Runtime.trial(mode="scenario")` exact facade
- compare-ready normalized summary
- final report payload exactness
- verification experiment 文件路径、helper 名称或局部 test harness 直接成为 authority law

### expert route 边界

- `@logixjs/core/repo-internal/reflection-api.verifyKernelContract`
- `@logixjs/core/repo-internal/reflection-api.verifyFullCutoverGate`

这两条能力当前只保留 expert-only 身份：

- 它们不属于 canonical control plane 一级入口
- 它们不占用默认门禁
- 它们共享的内部执行、证据、session primitive 统一归 `internal/verification/**`
- 它们通过同一个 `proofKernel` 消费共享执行语义，只保留 expert diff / gate 逻辑
- 通用序列化协议合同，例如 `JsonValue`，统一归 `internal/protocol/**`
- 这三层关系当前固定为：`proofKernel -> canonical adapter / expert adapter -> repo-internal bridge`

### 3. `runtime.compare`

定位：

- 标准化验证结果的对比入口

第一版默认比较面：

- 标准化验证报告
- 关键工件

硬边界：

- raw evidence / raw trace 只作下钻材料
- raw evidence / raw trace 不作为第一版默认比较协议
- `compare` 不得长成第二真相源

## 默认升级路径

默认升级路径固定为：

```text
runtime.check
  -> runtime.trial(mode="startup")
    -> runtime.trial(mode="scenario")
      -> runtime.compare
```

默认门禁只允许跑到：

- `runtime.check`
- `runtime.trial(mode="startup")`

## 与 result face 的关系

`Runtime.run` is the result face. `Runtime.trial` is the diagnostic run face. `Runtime.check` is the static diagnostic face.

- `Runtime.run(Program, main, options)` 启动 Program，执行应用侧 `main(ctx,args)`，返回业务结果
- `Runtime.run` 的结果可被文档 runner 投影成 JSON 展示对象，但该投影不是 machine diagnostic report
- `Runtime.trial(Program, options)` 返回 `VerificationControlPlaneReport`，用于装配、依赖、启动、关闭与后续修复判断
- `Runtime.check(Program, options?)` 返回 `VerificationControlPlaneReport`，只做静态快检，不启动 Program
- 同一份 Program source 可以同时用于 Run 与 Trial，但两者输出 shape 必须分离

### 168 parity adoption

168 已采纳一条从 kernel 到 Playground 的最小 parity 线：

- `VerificationDependencyCause` 是当前 dependency cause spine。它承接 service、config、Program import、child dependency、phase、provider source、owner coordinate、focusRef 与 errorCode，不新增广义 `DependencyClosureIndex`。
- `runtime.trial(mode="startup")` 产出的 `dependencyCauses / findings / repairHints` 是 CLI、Workbench 与 Playground 对 startup dependency failure 的共享事实源。
- `runtime.check` 仍是 static gate。只有 owner-declared declaration dependency gap 可进入 check finding；需要启动、装配或 Effect DI 求值才能发现的失败继续归 `runtime.trial(mode="startup")`。
- `Runtime.run` 继续只作为 result face，不返回 `VerificationControlPlaneReport`。Run 成功投影必须保留 `valueKind / lossy / lossReasons`，例如 `undefined -> null` 必须显式标记为 lossy。
- Run 失败进入 result-face failure projection，并可被 Workbench 投影成 `run-failure-facet`。它不得伪造成 Trial report。Sandbox/transport 投影必须保留 `ProgramRunner` wrapper 的 nested cause message，避免真实 main/boot/dispose 失败被折叠成不可诊断的外层错误。
- Preview-only host error、host compile failure 或 owner 缺失的失败，只能进入 host state、transport/pre-control-plane failure 或 evidence gap。

升级规则：

- 只有前一层无法解释问题时，才允许升级到更重层
- 若低层已经足够解释问题，禁止无条件升级到更重验证层
- 宿主级验证固定为专项层，默认不常开

## Agent First 输入协议

第一版场景级试运行默认输入协议固定为：

- `fixtures/env`
- `steps`
- `expect`

### `fixtures/env`

定位：

- 统一承接 mock、config、service override 与运行时环境注入

组织原则：

- 默认按命名资源槽位组织
- 再由控制面映射到底层 service、config 和 runtime override

第一版不把这些形态推成并列主入口：

- 直接 Layer 细节
- 直接 JS / Effect 回调
- 复杂表达式语言

它们只能作为受控扩展口。

### `steps`

第一版只收最小高频步骤集：

- `dispatch`
- `await`
- `read`
- `call`
- `tick`

### `expect`

第一版只收结构化断言原语：

- `equals`
- `includes`
- `exists`
- `count`
- `changed`

默认断言域：

- `state`
- `evidence summary`
- `artifacts`
- `environment`

宿主断言属于专项升级层，不进入第一版默认断言域。

## 与 examples / scenarios 的边界

- 本页只定义验证阶段、输入协议、机器报告与升级顺序
- 标准场景示例锚点继续集中在 [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- `fixtures/env + steps + expect` 的真实样例映射后续由 examples / verification 收口页继续承接
- `fixtures/env + steps + expect` 的 compiled plan 继续由 runtime control plane 持有；领域包只提供 declaration anchors、reason slots 与 scenario read anchors
- benchmark 若要复用 scenario 输入，只允许复用 execution carrier；它不创建第二验证 lane，也不拥有 perf truth

## 统一机器报告

统一机器报告按验证阶段组织。

第一版 top-level report shell 至少固定这些字段：

- `kind="VerificationControlPlaneReport"`
- `stage`
- `mode`
- `verdict`
- `errorCode`
- `summary`
- `environment`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`

额外规则：

- top-level report 不长：
  - `rows`
  - `issues`
  - `materializations`
  - 第二 explain object
- top-level 扩展口只允许继续通过：
  - `artifacts`
  - `repairHints`

顶层 `verdict` 固定为三态：

- `PASS`
- `FAIL`
- `INCONCLUSIVE`

第一版 `mode` 固定为：

- `static`
- `startup`
- `scenario`
- `compare`

设计要求：

- 默认先返回标准化报告
- 默认带结构化 `repairHints`
- raw evidence 只作附加下钻材料
- 不把“让 Agent 自己从海量 trace 猜问题”当成主设计

为支撑 repair loop，machine report 还必须能表达下面这组局部稳定坐标：

- `declSliceId`
- `reasonSlotId`
- `scenarioStepId`
- `sourceRef`

这些坐标当前继续通过单一 `focusRef` 承接：

```ts
type VerificationControlPlaneFocusRef = {
  declSliceId?: string
  reasonSlotId?: string
  scenarioStepId?: string
  sourceRef?: string
}
```

附加规则：

- `reasonSlotId / sourceRef` 在 report shell 中只允许承载 domain-owned opaque stable id
- report shell 不展开 domain payload 本体
- `focusRef` 字段定义只允许以本页和 core contract 为权威
- `focusRef` 只允许本页列出的坐标键；`sourceReceiptRef / keyHashRef / bundlePatchPath / bundlePatchRef / ownerRef` 不得进入 `focusRef`
- Form 当前 submit gate 的最小 compare feed 已使用 `submit:<seq>` 作为 `reasonSlotId`，它只表示 opaque stable id，不额外展开 domain payload

`repairHints` 的 machine core 固定为：

- `code`
- `canAutoRetry`
- `upgradeToStage`
- `focusRef`

消费层字段当前允许保留为可选：

- `reason`
- `suggestedAction`

若当前失败能被局部化到 declaration / scenario-plan / evidence truth：

- 至少一个 repair hint 必须带非空 `focusRef`

若当前失败纯属 global boot / env / CLI route 级失败：

- `focusRef` 可以为空

CLI 对齐约束：

- `@logixjs/cli` 的一级命令面只认 `check / trial / compare`
- CLI 的长期边界、existence gate、discovery boundary、input matrix 与 output transport law 统一看 [./15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)
- Agent 日常自验证闭环、装配漏加覆盖目标、CLI 缺口与内核反压清单统一看 [./16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)
- 其余维护级命令若继续存在，只能停在 `@logixjs/cli` 的 internal owner
- 旧试运行命名退出主命令面，由 `trial` 承接最小结构化报告
- 共享 report contract 由 `@logixjs/core/ControlPlane` 持有
- CLI 返回的 machine report 必须带 `mode / errorCode / environment`
- CLI 的 `verdict` 继续只认 `PASS / FAIL / INCONCLUSIVE`

## compare admissibility gate

compare 的主轴固定为：

- `declarationDigest`
- `scenarioPlanDigest`
- `evidenceSummaryDigest`

附加规则：

- `artifact digest` 只作附属材料，不进入 compare 主轴
- materializer artifact 默认不进入 compare 主轴
- environment fingerprint 不同时，`compare` 默认 `INCONCLUSIVE`
- rendered string 不进入 compare 主轴
- message token 只影响 evidence summary 的归一化

宿主消费约束：

- `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react` 都只消费统一 control plane
- `@logixjs/test` 的 exact public survivor set 当前只保留 root `TestProgram`
- `@logixjs/sandbox` 的 exact public survivor set 当前只保留 root `SandboxClientTag / SandboxClientLayer` 与 `@logixjs/sandbox/vite`
- `@logixjs/devtools-react` 的 exact public survivor set 当前归零；浏览器检查面只允许停在 repo-internal 或 app-local wiring
- sandbox / test / devtools 不再自长第二套验证或证据协议
- DVTools 的内部工作台边界、默认 session/finding 主线和删除方向统一看 [./14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md)
- DVTools 可以把 selected session / finding 导出为 canonical evidence package + selection manifest，供 CLI 进入 `runtime.check / runtime.trial / runtime.compare`
- selection manifest 只作 CLI / Agent entry hint，不进入 control-plane report truth、evidence truth 或 compare 主轴
- expert route 与 canonical route 的 owner 分层必须保持稳定；默认 consumer 不得因为 internal owner 调整回流到 root `Reflection.verify*`
- workflow artifact 若仍存在，只允许作为 internal control-plane artifact；不再回流为公开 authoring or assembly truth

examples 对齐约束：

- `examples/logix/src/verification/**` 继续只认 `fixtures/env + steps + expect`
- docs -> example -> verification 的主线映射统一由 `examples/logix/src/verification/index.ts` 承接

late-bound explain / repair materializer 当前继续只允许走一条 artifact-backed linking law：

- 任何 materializer 都必须作为 artifact 被引用
- top-level report 继续只通过 `artifacts[]` 暴露这些 materializer
- `repairHints[].relatedArtifactOutputKeys` 若存在，继续只引用 `artifacts[]` 里的真实 `outputKey`
- runtime control plane 继续只拥有 linking shell，不拥有 domain payload exactness
- stage-specific materializer payload exactness 继续由对应 domain SSoT 持有

canonical naming 继续固定为：

- `VerificationControlPlaneReport` 是唯一 canonical report shape
- `RuntimeCheckReport / RuntimeTrialReport / RuntimeCompareReport` 若还存在，只允许停在 artifact/file residue 层
- `TrialReport` 继续只允许作为 pure alias，不允许拥有第二 shape、第二 schema version、第二 authority

升级建议规则：

- 每次 `runtime.check / runtime.trial / runtime.compare` 都必须返回明确的 `nextRecommendedStage`
- 当 `verdict = INCONCLUSIVE` 时，控制面必须给出唯一推荐的下一层验证入口
- 当当前层已经足够解释问题时，`nextRecommendedStage` 必须为空
- `nextRecommendedStage` 是 Agent 调度的唯一 top-level authority
- `repairHints[].upgradeToStage` 只能解释单条 hint 的局部升级建议
- 若多个 `repairHints[].upgradeToStage` 与 top-level `nextRecommendedStage` 不一致，Agent 必须按 `nextRecommendedStage` 调度
- control plane 必须把多个 hint-local upgrade 收敛为唯一 `nextRecommendedStage`，或返回 `INCONCLUSIVE` 并给出唯一升级入口

## package ownership

第一版 owner 边界固定为：

- `@logixjs/core`：contract owner
- `@logixjs/cli`：CLI route owner
- `@logixjs/test`：test harness owner，公开面只保留 root `TestProgram`
- `@logixjs/sandbox`：browser host wiring owner，公开面只保留 root `SandboxClientTag / SandboxClientLayer` 与 `vite`

## AI Native 与成本护栏

- 静态化只做必要部分
- 默认门禁只允许跑到“静态验证 + 启动级试运行”
- 场景级试运行、宿主级试运行、`replay` 只有在显式触发，或低层无法解释问题时才允许升级
- 默认比较面只允许使用“标准化验证报告 + 关键工件”
- raw evidence、全量 trace、宿主时序日志不作为默认比较面

## Agent self-verification pressure adoption

[16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md) 只提供 pressure index。进入本页 owner 的采纳条件固定为：

- `Runtime.check` 必须能表达 static pressure，但不得启动 runtime；优先压力是 Program blueprint guard、Program-only imports、duplicate imports、declaration freshness、sourceRef link 与 PASS coverage boundary。
- `runtime.trial(mode="startup")` 的 dependency parser 必须从 free-text parsing 收敛为 typed dependency cause pressure；至少覆盖 service、config、Program import、child dependency、phase、provider source 与 owner coordinate。
- `repairHints.focusRef` 只投影稳定坐标；module declaration slice、scenario step、sourceRef、reason slot 都不能展开 domain payload。
- boot/close 双摘要必须不互相覆盖；close failure 只能通过 artifact-backed linking 或 report summary pressure 暴露。
- `runtime.compare` 的 admissibility 主轴继续是 declaration digest、scenario plan digest、evidence summary digest 与 environment fingerprint。
- PASS 必须只表示当前 stage 覆盖范围内通过；future scenario、host deep、raw trace 未执行时不得被暗示为通过。
- repeatability proof 只允许忽略 runId、允许的 file path/outDir 差异；verdict、errorCode、artifact keys、digest 与 next stage 必须稳定。

当前 core/kernel 已落地的最小报告字段：

- `findings` 承接 check/compare/trial 的机器发现，包含 `kind / code / ownerCoordinate / summary / focusRef / sourceArtifactRef`。
- `dependencyCauses` 承接 startup trial 的 typed dependency cause，包含 `kind / phase / ownerCoordinate / providerSource / childIdentity / focusRef / errorCode`。
- `lifecycle` 承接 startup trial 的 boot/close summary，`primaryFailure` 与 `closeSummary` 不互相覆盖，artifact link 只允许指向 `artifacts[].outputKey`。
- `lifecycle` 这里是 report evidence noun，只承接 runtime-owned boot/close/readiness 事实；它不是 public Logic authoring noun。
- `admissibility` 承接 compare gate，固定比较 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest / environmentFingerprint`。
- `repeatability` 承接 report-level normalized digest，只忽略 `environment.runId`、允许的 file/path/outDir 差异和 artifact file locator 差异。

对应实施 spec：

- [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)
- [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)

## 升级层说明

当前默认门禁之外，后续升级层按这条顺序理解：

1. `trial(mode="scenario")`
   - 只有 `runtime.check` 与 `runtime.trial(mode="startup")` 解释不了问题时才进入
   - 输出继续沿用标准化验证报告字段：`stage / mode / verdict / summary / repairHints / nextRecommendedStage`
2. `runtime.compare`
   - 继续只比较“标准化验证报告 + 关键工件”
   - 默认要求两侧报告协议一致，再进入 compare
3. `replay`、宿主级深验证、raw evidence compare
   - 继续停在升级层
   - 默认不常开
   - 需要单独证明为什么当前问题不能由低层解释
   - 专项输出仍应回到结构化报告或关键工件，不允许把海量 trace 直接变成默认比较面

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)

## 相关规范

- [./02-hot-path-direction.md](./02-hot-path-direction.md)
- [./04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [./08-domain-packages.md](./08-domain-packages.md)
- [./14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md)
- [./15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)
- [./16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)
- [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)
- [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../standards/effect-v4-baseline.md](../../standards/effect-v4-baseline.md)

## 当前一句话结论

验证控制面已经收敛为 `runtime.check / runtime.trial / runtime.compare` 三段主干；当前 report shell 也继续收口到单一 `VerificationControlPlaneReport`、coordinate-first `repairHints.focusRef` 与 artifact-backed linking law。它服务 Agent 自我验证，但不反向长成新的 authoring surface、第二真相源、第二 report object 或默认重门禁。
