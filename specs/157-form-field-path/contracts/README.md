# Contracts: Form Companion Formalization

本 feature 的 contract 以 package surface、selector law、verification control plane 为主，不需要 OpenAPI / HTTP schema。

当前 planning 阶段固定三类 contract：

## 1. Authoring Contract

- `field(path).companion({ deps, lower })`
- owner scope: `field-only`
- day-one slot: `availability / candidates`
- output law: `clear | bundle + atomic commit`

## 2. Read Contract

- canonical route 固定为 `useModule + useSelector(handle, selectorFn)`
- `157` 主线只证明 recipe-only admissibility
- 不暴露 raw internal landing path
- helper / selector primitive 若要进入主线，必须先 reopen

## 3. Evidence Contract

- `source -> companion -> rule / submit` 必须维持同一条 diagnostics / evidence chain
- row-heavy attribution 必须与 existing row identity / reason truth 对齐
- primary proof route 固定为 `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario)`，`runtime.compare` 只在需要解释差异时启用
