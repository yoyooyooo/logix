import React from 'react'
import { RuntimeProvider, useDispatch, useModule, useSelector } from '@logixjs/react'
import {
  SearchQuery,
  SearchSpec,
  DetailSpec,
  QuerySearchDemoHostModule,
  queryRuntime,
  type Params,
  type Ui,
} from '../../modules/querySearchDemo'

// ---------------------------------------------------------------------------
// 3) React 视图：只做投影与 action 派发（不在 useEffect 手写触发逻辑）
// ---------------------------------------------------------------------------

const StatusBadge: React.FC<{ readonly status: string }> = ({ status }) => {
  const tone =
    status === 'success'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : status === 'loading'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : status === 'error'
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  return <span className={`px-2 py-1 rounded-full text-[10px] font-mono ${tone}`}>{status}</span>
}

const Panel: React.FC = () => {
  // Query 也是 Module：推荐通过 ModuleRef 的 imports.get(...) 在父实例 scope 下解析子模块（避免串实例）。
  const host = useModule(QuerySearchDemoHostModule.impl)

  const query = host.imports.get(SearchQuery.tag)
  const dispatch = useDispatch(query)

  const params = useSelector(query, (s) => s.params)
  const ui = useSelector(query, (s) => s.ui)
  const search = useSelector(query, (s) => s.queries.search)
  const detail = useSelector(query, (s) => s.queries.detail)

  const searchData = search.status === 'success' ? search.data : undefined
  const detailData = detail.status === 'success' ? detail.data : undefined

  const items = searchData?.items ?? []

  const keywordText = params.q.trim()
  const total = searchData?.total
  const totalPages = searchData?.totalPages

  const setParams = (next: Params) => dispatch({ _tag: 'setParams', payload: next })

  const setUi = (next: Ui) => dispatch({ _tag: 'setUi', payload: next })

  const refresh = (target?: 'search' | 'detail') => dispatch({ _tag: 'refresh', payload: target })

  const invalidateSearch = () =>
    dispatch({
      _tag: 'invalidate',
      payload: { kind: 'byResource', resourceId: SearchSpec.id },
    })

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Query · 搜索 + 详情联动</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed mt-2">
              该 Demo 用{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Query.make</code>
              定义 “params → ResourceSnapshot” 的同源链路；触发语义由领域默认 logics 承担，UI 不再手写
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono mx-1">
                useEffect
              </code>
              监听。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-indigo-600 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              onClick={() => refresh()}
            >
              手动刷新
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={invalidateSearch}
            >
              失效 Search
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Resource: <span className="font-mono">{SearchSpec.id}</span>
              </div>
            </div>
            <StatusBadge status={search.status} />
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-gray-700 dark:text-gray-200">
              关键词
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={params.q}
                onChange={(e) =>
                  setParams({
                    ...params,
                    q: e.target.value,
                    page: 1,
                    selectedId: null,
                  })
                }
                placeholder="留空=查全部；输入关键字=模拟 1s 返回（200ms debounce）"
              />
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={!!ui?.query?.autoEnabled}
                  onChange={(e) => setUi({ query: { autoEnabled: e.target.checked } })}
                />
                允许自动触发
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  disabled={params.page <= 1}
                  onClick={() =>
                    setParams({
                      ...params,
                      page: Math.max(1, params.page - 1),
                      selectedId: null,
                    })
                  }
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  disabled={search.status === 'success' && searchData?.hasNext === false}
                  onClick={() =>
                    setParams({
                      ...params,
                      page: params.page + 1,
                      selectedId: null,
                    })
                  }
                >
                  下一页
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            {search.status === 'idle' ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                关闭“允许自动触发”后，search 会进入 idle；开启后默认返回全部结果（keyword 为空）。
              </div>
            ) : null}

            {search.status === 'loading' ? (
              <div className="text-sm text-amber-700 dark:text-amber-300">Loading...</div>
            ) : null}

            {search.status === 'error' ? (
              <div className="text-sm text-rose-700 dark:text-rose-300">
                Error: <span className="font-mono text-xs">{String(search.error ?? '')}</span>
              </div>
            ) : null}

            {search.status === 'success' ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  点击一条结果以触发 detail 联动（selectedId → detail）
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  keyword: {keywordText || '（全部）'} · total: {total ?? 0} · page {params.page}
                  {totalPages ? `/${totalPages}` : null}
                </div>
                {items.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">无结果</div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                    {items.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          params.selectedId === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                        onClick={() => setParams({ ...params, selectedId: item.id })}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Resource: <span className="font-mono">{DetailSpec.id}</span>
              </div>
            </div>
            <StatusBadge status={detail.status} />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            selectedId：<span className="font-mono">{String(params.selectedId ?? 'null')}</span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            {detail.status === 'idle' ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">选择一条搜索结果以激活 detail 查询。</div>
            ) : null}

            {detail.status === 'loading' ? (
              <div className="text-sm text-amber-700 dark:text-amber-300">Loading...</div>
            ) : null}

            {detail.status === 'error' ? (
              <div className="text-sm text-rose-700 dark:text-rose-300">
                Error: <span className="font-mono text-xs">{String(detail.error ?? '')}</span>
              </div>
            ) : null}

            {detail.status === 'success' ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{detailData?.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {detailData?.description}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export const QuerySearchDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={queryRuntime}>
      <React.Suspense fallback={<div>Query demo 加载中…</div>}>
        <Panel />
      </React.Suspense>
    </RuntimeProvider>
  )
}
