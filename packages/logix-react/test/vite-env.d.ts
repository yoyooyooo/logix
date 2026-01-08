interface ImportMetaEnv {
  readonly VITE_LOGIX_PERF_PROFILE?: string
  readonly VITE_LOGIX_PERF_HUMAN?: string
  readonly VITE_LOGIX_PERF_HARD_GATES?: string
  readonly VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER?: string
  readonly VITE_LOGIX_PERF_TUNING_ID?: string
  readonly VITE_LOGIX_PERF_KERNEL_ID?: string
  readonly VITE_LOGIX_CORE_NG_EXEC_VM_MODE?: string
  readonly VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS?: string
  readonly VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
