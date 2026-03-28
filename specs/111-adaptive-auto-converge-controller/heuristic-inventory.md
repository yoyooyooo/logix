# Static Heuristic Drift Inventory

## Current status

- inventory status: `ready`
- current entry decision: `inconclusive_after_clean_scout`
- note:
  - 该 inventory 只完成静态 heuristic 盘点；当前 shadow code PoC 的解锁还依赖 clean scout 与 `110` handoff 更新

## Inventory Table

| heuristicId | codeAnchor | currentRuleOrValue | inputDimensions | decisionEffect | currentEvidenceFields | knownDriftSignal | envScope | adaptiveReplacementPlan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `near_full_root_ratio_threshold` | `getNearFullRootRatioThreshold(stepCount)` | step-count band threshold function | `stepCount`, `dirtyRootRatio` | `auto -> full` near-full fallback | `requestedMode`, `executedMode`, `reasons`, `stepStats`, `dirty.rootCount` | same runtime code change may shift threshold usefulness | `node/browser`, per band | replace with band-level `fullCostEstimate vs dirtyCostEstimate` |
| `auto_floor_ratio` | `AUTO_FLOOR_RATIO` | `1.05` | `stepCount`, `dirtyRootRatio`, `decision budget` | `auto -> full` floor guard | `executionDurationMs`, `decisionDurationMs`, `reasons` | browser long-run and same-node subset may drift separately | `node/browser`, high-dirty | replace with confidence-aware safety margin |
| `max_cacheable_root_ratio` | `MAX_CACHEABLE_ROOT_RATIO` | `0.5` | `dirtyRootRatio`, `cacheState` | cacheability / plan reuse | `cache.hit`, `missReason`, `disableReason`, `generation` | cacheability and residual shape may diverge by env bucket | `node/browser`, cache state class | replace with per-band cacheability state |
| `no_cache_near_full_step_threshold` | `NO_CACHE_NEAR_FULL_STEP_THRESHOLD` | static step cutoff | `stepCount`, `cache disabled state` | force full / bypass dirty planning | `reasons`, `configScope`, `stepStats` | small graph / large graph may react differently after runtime changes | per step band | replace with band-aware `fallbackReason` driven logic |
| `near_full_plan_ratio_threshold` | `NEAR_FULL_PLAN_RATIO_THRESHOLD` | static plan ratio threshold | `planLength`, `stepCount` | `dirty -> full` near-full plan fallback | `reasons`, `affectedSteps`, `stepStats` | plan-size sensitivity likely drifts with graph topology | per plan band | replace with measured plan-cost estimator |

## Second-Batch Candidates

- `AUTO_FAST_FULL_EWMA_THRESHOLD_MS`
- `AUTO_FAST_FULL_WARMUP_FULL_SAMPLES_OFF`
- `AUTO_TINY_GRAPH_FULL_STEP_THRESHOLD`

## Usage

- primary source for `T503`
- referenced by `plan.md` for rollout and validation
- consumed by `T504` when forming `controller_related | inconclusive_after_clean_scout | browser_noise`
