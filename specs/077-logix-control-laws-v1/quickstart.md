# Quickstart: 077 Logix Control Laws v1（怎么用）

这是一个“总控 spec”：只要记住 077，你就能找到 073/075/076 的执行入口与顺序。

## 1) 先读唯一公式（SSoT）

- 打开 `docs/ssot/platform/contracts/00-execution-model.md` 的 “1.2 最小系统方程”。

## 2) 再看索引式清单（执行入口）

- 打开 `specs/077-logix-control-laws-v1/checklists/group.registry.md`：
  - 它只做跳转与 gate 汇总；
  - 真正的实现任务在 member 的 `tasks.md`。

## 3) 推荐推进顺序

- 先做 073 的 **M1（Reference Frame Cutover）**：把 tickSeq 参考系立住（React 单订阅点/no-tearing）。
- 再做 075：把自由编排升级为 FlowProgram（时间算子进入 tick 证据链）。
- 再做 076：消灭 Query/Form 的 watcher 胶水（source auto-trigger 内核化）。

## 4) 做到哪里算“交付”

- 你能在一个端到端场景里证明：
  - UI 只渲染（不写数据同步 useEffect）
  - 逻辑编排是声明式 Program（非 watcher 胶水）
  - 因果链可解释（IR + trace 锚点对齐 tickSeq）

