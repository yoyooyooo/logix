import { useRef, useEffect } from "react"

// 浅比较依赖数组
function depsChanged(prev: React.DependencyList | undefined, next: React.DependencyList): boolean {
  if (!prev) return true
  if (prev.length !== next.length) return true
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true
  }
  return false
}

/**
 * useDisposable
 *
 * 一个用于管理"创建-销毁"生命周期的 Hook。
 * 保证 factory 在依赖变化时重新执行，并自动清理旧实例。
 */
export function useDisposable<T>(
  factory: () => T,
  cleanup: (instance: T) => void,
  deps: React.DependencyList
): T {
  const instanceRef = useRef<T | null>(null)
  const depsRef = useRef<React.DependencyList | undefined>(undefined)
  const initializedRef = useRef(false)

  // 1. 渲染阶段：检查是否需要(重新)创建
  if (!initializedRef.current || depsChanged(depsRef.current, deps)) {
    // 如果是重建，先清理旧的
    if (initializedRef.current && instanceRef.current) {
      cleanup(instanceRef.current)
    }

    instanceRef.current = factory()
    depsRef.current = deps
    initializedRef.current = true
  }

  // 2. 卸载阶段：最终清理
  useEffect(() => {
    return () => {
      if (initializedRef.current && instanceRef.current) {
        cleanup(instanceRef.current)
        initializedRef.current = false
      }
    }
  }, [])

  return instanceRef.current!
}
