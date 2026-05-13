# 拆解简报

**状态**: 规划建账已完成；当前尚未进入具体源文件修改。

171 可能触及 runtime core、observability、workbench、reflection、CLI、Playground、DVTools 多个模块。任何实施任务触及 >=1000 LOC 文件，或预计使文件超过 1000 LOC，必须先补齐本页并把拆分任务写回 [tasks.md](../tasks.md)。

## 当前账本

| target file/module | current LOC | planned change | split form | decision |
| --- | ---: | --- | --- | --- |
| 尚未识别具体大文件 | 不适用 | 当前只完成规划文档回写，未开始 runtime 代码修改 | 不适用 | 实施前如命中 >=1000 LOC 文件，先补本表再改代码 |

## 拆分原则

- 无损拆分与语义改动分离。
- 单一主体优先同目录 `*.*.ts` 平铺。
- 子系统优先目录承载。
- `src/internal/**` 不得反向 import `src/*.ts`。
- 循环依赖视为边界失败。

## 验证

- 每个拆分步骤至少跑对应 package typecheck。
- 语义改动单独任务、单独测试、单独 proof。
- 拆分只允许降低冲突面和模块耦合，不能引入第二 runtime truth、第二 evidence envelope 或 public root。
