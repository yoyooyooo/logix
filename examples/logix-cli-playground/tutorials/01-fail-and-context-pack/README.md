# 01 · 故意失败一次（学会怎么定位 + 怎么交给 Agent）

目标：让你看到“门禁失败时到底长什么样”，并学会把 **最小事实包** 交给 Agent（或留给未来的你）。

## 1) 故意制造一个门禁失败（预期：exit code 2）

这个 demo 会强制要求 `@logixjs/form.rulesManifest@v1`（当前入口不会产出），所以一定会 FAIL：

```bash
pnpm -C examples/logix-cli-playground cli:contract:requireRules:fail
```

> 注意：这是“故意失败”的教学关卡，所以 `pnpm` 会显示 `ELIFECYCLE`（因为 exit code=2）。**这不是脚本坏了**。

## 2) 找到输出目录

输出目录固定是：

- `examples/logix-cli-playground/.logix/out/contract-suite.run/demo-contract-requireRules-fail/`

## 3) 先看 verdict（人类最快读法）

打开 `contract-suite.verdict.json`，你只需要关注三件事：

- `verdict: "FAIL"`（门禁失败）
- `reasons[]`（每条 reason 都是“可行动原因”）
- `artifacts[]` 里哪些是 `MISSING`（例如 rulesManifest）

## 4) 再看 context pack（给 Agent/脚本的最小事实包）

`contract-suite.context-pack.json` 可以理解成：

> “我不想解释一堆背景，你直接读这个 JSON，就能开始分析/修复/出补丁的最小输入。”

你不需要读完整内容；新手只需要知道它包含：

- `facts.artifacts[]`：门禁关心的 artifact 是否存在（以及部分会带 `value`）
- `facts.trialRunReport`：试跑的最小摘要（可用于定位缺口）
- `verdict`：同 `contract-suite.verdict.json`（便于一个文件搞定）

如果你要把这个结果交给 Agent，最推荐的做法是：

- 直接把 `contract-suite.context-pack.json` 的文件路径贴给他（再补一句“这是 contract-suite 的最小事实包”）

## 5) 体验 inputs 注入（让事实包更贴近你的上下文）

把一个最小 `inputs.demo.json` 注入到 context pack（这一步是 PASS，但会强制产出 context pack）：

```bash
pnpm -C examples/logix-cli-playground cli:contract:inputs
```

看输出：

- `examples/logix-cli-playground/.logix/out/contract-suite.run/demo-contract-inputs/contract-suite.context-pack.json`

## 常见问题

- 为什么我看到 `ELIFECYCLE`：因为这关是“故意 FAIL”，exit code 2 是预期信号；真正需要读的是输出目录里的 `contract-suite.verdict.json`。
