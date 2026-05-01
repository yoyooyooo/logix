# Contracts: Host Runtime Rebootstrap

## 1. Role Contract

- `@logixjs/react` 承接 React host 语义
- `@logixjs/sandbox` 承接受控实验与 trial 环境
- `@logixjs/test` 承接统一测试入口
- `@logixjs/devtools-react` 承接观测 UI

## 2. Shared Control Plane Contract

- 四个包都围绕 `runtime.check / runtime.trial / runtime.compare` 口径组织
- sandbox / test / devtools 的证据和工件格式必须统一
- 具体共享面以 `inventory/shared-control-plane.md` 为准

## 3. Reuse Contract

- 已对齐目标契约的宿主协议、fixtures、browser / integration tests 优先复用
- 只有边界失配的部分进入重组
- 复用台账以 `inventory/reuse-ledger.md` 为准

## 4. React Consistency Contract

- React host 语义必须维持单快照读取
- 目录模板不得引回双真相源或数据胶水 `useEffect`
- 各包模板以 `inventory/package-templates.md` 为准
