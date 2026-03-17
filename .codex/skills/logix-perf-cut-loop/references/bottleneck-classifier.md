# Bottleneck Classifier

## 四分法

1. 真实运行时瓶颈
- 事务数过多
- 同一语义反复跨层
- 不必要的 Suspense/fallback
- 不必要的对象构造/trace 资产

2. 证据语义错误
- 计时起点不对
- 把批量交互总耗时当单次交互
- 把 timer enqueue 算进 runtime 指标
- benchmark 根本没测到它自称在测的路径

3. 门禁表达错误
- `notApplicable` 被误当失败
- `decisionMissing` 来源于证据裁剪，不是性能退化
- sub-ms 波动被相对预算放大

4. 已解决但证据滞后
- targeted 已过，但 broad/full matrix 还没刷新
- suite 结构改了，旧 before/after 不再可比

## 使用顺序

- 先判 suite 语义是否正确
- 再判门禁是否表达正确
- 最后才决定要不要动内核
