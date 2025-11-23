import { useState, useCallback } from "react"

// 简单的强制刷新 hook，递增内部计数以触发 React 更新
export function useForceUpdate() {
  const [, setTick] = useState(0)
  return useCallback(() => setTick((n) => n + 1), [])
}
