# Contracts: Docs Foundation Governance Convergence

## 1. Root Routing Contract

- foundation 页面必须能解释自己的角色和跳转去向
- foundation 页面不得定义 leaf 业务事实
- runtime / platform 子树 README 必须给出 owner 路由

## 2. Promotion Contract

- proposal / next 只能作为过渡层
- active proposal / next doc 必须带最小元数据
- 被消费后必须写明去向

## 3. Writeback Contract

- 新增 docs cluster 时，必须同步回写根入口、相关子树入口和必要的 governance/next 路由
- 若影响 coverage owner 或批次状态，必须同步回写 `120` registry 与 group checklist
