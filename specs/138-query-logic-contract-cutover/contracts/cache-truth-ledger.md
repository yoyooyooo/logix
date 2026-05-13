# Cache Truth Ledger: Query Logic Contract Cutover

## Single Truth Rule

- query cache snapshot 必须投影回模块 state
- package 不允许再长第二套 cache truth

## Allowed Shapes

- `queries.<name>` 下的 state snapshot
- engine-side cache as integration detail

## Forbidden Shapes

- UI 直接长期依赖 engine cache 作为独立 truth
- package root 再暴露一组与 state 并行的 cache-facing authoring API
