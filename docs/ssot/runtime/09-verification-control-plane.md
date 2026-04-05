---
title: Verification Control Plane
status: living
version: 1
---

# Verification Control Plane

## 目标

统一静态自我验证与运行式自我验证，并把它们收敛为一套 AI Native、Agent First 的 `runtime control plane`。

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

- 类型检查
- manifest / static IR
- public surface diff
- contract diff
- 依赖与配置声明检查

硬边界：

- 不隐式代跑启动验证
- 不隐式代跑行为验证
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
- 资源能否正常关闭
- 启动与关闭阶段是否出现明确运行时失败

`scenario` 承接：

- 在受控环境中执行声明式交互脚本
- 验证关键状态变化、关键证据摘要、关键工件与环境结果

硬边界：

- `trial.scenario` 只服务验证
- `trial.scenario` 不承担当正式业务逻辑入口
- `trial.scenario` 不承当复用型运行时程序资产
- `trial.scenario` 不进入公开 authoring 主链

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

## 统一机器报告

统一机器报告按验证阶段组织。

第一版至少固定这些字段：

- `stage`
- `mode`
- `verdict`
- `errorCode`
- `summary`
- `environment`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`

顶层 `verdict` 固定为三态：

- `PASS`
- `FAIL`
- `INCONCLUSIVE`

设计要求：

- 默认先返回标准化报告
- 默认带结构化 `repairHints`
- raw evidence 只作附加下钻材料
- 不把“让 Agent 自己从海量 trace 猜问题”当成主设计

`repairHints` 的第一版结构固定为数组，每一项至少包含：

- `code`
- `reason`
- `suggestedAction`
- `canAutoRetry`
- `upgradeToStage`

升级建议规则：

- 每次 `runtime.check / runtime.trial / runtime.compare` 都必须返回明确的 `nextRecommendedStage`
- 当 `verdict = INCONCLUSIVE` 时，控制面必须给出唯一推荐的下一层验证入口
- 当当前层已经足够解释问题时，`nextRecommendedStage` 必须为空

## AI Native 与成本护栏

- 静态化只做必要部分
- 默认门禁只允许跑到“静态验证 + 启动级试运行”
- 场景级试运行、宿主级试运行、`replay` 只有在显式触发，或低层无法解释问题时才允许升级
- 默认比较面只允许使用“标准化验证报告 + 关键工件”
- raw evidence、全量 trace、宿主时序日志不作为默认比较面

## 当前一句话结论

验证控制面已经收敛为 `runtime.check / runtime.trial / runtime.compare` 三段主干；它服务 Agent 自我验证，但不反向长成新的 authoring surface、第二真相源或默认重门禁。
