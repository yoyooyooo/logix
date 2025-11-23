import { useRegionCascade } from "../hooks/useRegionCascade"

export function RegionCascade() {
  const provinceSelectId = "province-select"
  const citySelectId = "city-select"
  const districtSelectId = "district-select"
  const {
    provinces,
    cities,
    districts,
    state,
    loading,
    error,
    selectProvince,
    selectCity,
    selectDistrict,
    reset,
    retry
  } = useRegionCascade()

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center justify-between">
          <span className="text-red-600 text-sm">加载失败: {error}</span>
          <button
            onClick={retry}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium mb-2"
          htmlFor={provinceSelectId}
        >
          省份
        </label>
        <select
          id={provinceSelectId}
          value={state.provinceId ?? ""}
          onChange={(event) => selectProvince(event.target.value || null)}
          disabled={loading}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">请选择省份</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-2"
          htmlFor={citySelectId}
        >
          城市
        </label>
        <select
          id={citySelectId}
          value={state.cityId ?? ""}
          onChange={(event) => selectCity(event.target.value || null)}
          disabled={loading || !state.provinceId}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">{loading ? "加载中..." : "请选择城市"}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-2"
          htmlFor={districtSelectId}
        >
          区县
        </label>
        <select
          id={districtSelectId}
          value={state.districtId ?? ""}
          onChange={(event) => selectDistrict(event.target.value || null)}
          disabled={loading || !state.cityId}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">{loading ? "加载中..." : "请选择区县"}</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "重置中..." : "重置"}
        </button>

        {loading && <span className="text-gray-500">加载中...</span>}
      </div>
    </div>
  )
}

