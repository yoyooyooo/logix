# Contract: Migration Playbook（隐式 trial -> 默认 full cutover）

## 迁移范围

适用于依赖旧行为“未配置 gate mode 时默认容忍 fallback”的调用方。

## 必做动作

1. 检查所有 `core-ng` 或非 `core` kernel 运行入口。
2. 如果业务确实需要“先跑通再收敛”，显式注入：
   - `Logix.Kernel.fullCutoverGateModeLayer('trial')`
3. 更新失败处理逻辑，读取 `FullCutoverGateFailed` 的：
   - `reason`
   - `evidence.missingServiceIds`
   - `evidence.fallbackServiceIds`
4. 更新测试断言：
   - 无配置时应触发严格门禁（不再隐式 fallback）
   - 显式 trial 时应可继续运行且 reason 可解释

## 禁止事项

- 禁止新增兼容层把默认行为偷偷改回 trial。
- 禁止用环境变量隐式切模式（必须显式配置）。

## 回滚策略（仅调试窗口）

- 若线上紧急排障需要短期放宽门禁，可在运行时显式注入 `trial`。
- 排障结束后必须移除该配置并恢复默认 full cutover。
