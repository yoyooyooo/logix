import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface Province {
  code: string;
  name: string;
}

export interface City {
  code: string;
  name: string;
  provinceCode: string;
}

export interface District {
  code: string;
  name: string;
  cityCode: string;
}

// 加载省份列表
export const LoadProvincesPattern = definePattern<{}>({
  id: "poc/dependent-selects/load-provinces",
  version: "1.0.0",
  tags: ["location", "province"],
  config: Schema.Struct({}),
  body: () =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log("location.loadProvinces.start");

      const provinces = yield* dsl.call<Province[]>(
        "LocationService",
        "listProvinces",
        {}
      );

      yield* dsl.log(
        `location.loadProvinces.done count=${provinces.length}`
      );

      // 简单地写入固定状态路径，真实项目可通过 config 参数化
      yield* dsl.set("ui.location.provinces", provinces);
    })
});

// 省份变更：根据省份加载城市，并清空区县
export const OnProvinceChangePattern = definePattern<{
  provinceCode: string;
}>({
  id: "poc/dependent-selects/on-province-change",
  version: "1.0.0",
  tags: ["location", "province"],
  config: Schema.Struct({
    provinceCode: Schema.String
  }),
  body: ({ provinceCode }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `location.onProvinceChange provinceCode=${provinceCode}`
      );

      const cities = yield* dsl.call<City[]>(
        "LocationService",
        "listCities",
        { provinceCode }
      );

      // 省份变更时，清空区县
      const districts: District[] = [];

      yield* dsl.set("ui.location.cities", cities);
      yield* dsl.set("ui.location.districts", districts);
    })
});

// 城市变更：根据城市加载区县
export const OnCityChangePattern = definePattern<{
  cityCode: string;
}>({
  id: "poc/dependent-selects/on-city-change",
  version: "1.0.0",
  tags: ["location", "city"],
  config: Schema.Struct({
    cityCode: Schema.String
  }),
  body: ({ cityCode }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `location.onCityChange cityCode=${cityCode}`
      );

      const districts = yield* dsl.call<District[]>(
        "LocationService",
        "listDistricts",
        { cityCode }
      );

      yield* dsl.log(
        `location.loadDistricts.done count=${districts.length}`
      );

      yield* dsl.set("ui.location.districts", districts);
    })
});

