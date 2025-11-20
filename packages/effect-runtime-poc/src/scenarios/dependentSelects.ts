import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

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

export interface LocationService {
  listProvinces: () => Promise<Province[]>;
  listCities: (provinceCode: string) => Promise<City[]>;
  listDistricts: (cityCode: string) => Promise<District[]>;
}

export class LocationServiceTag extends Context.Tag("LocationService")<
  LocationServiceTag,
  LocationService
>() {}

export type DependentSelectEnv = LoggerTag | LocationServiceTag;

export const loadProvincesFlow: Effect.Effect<
  Province[],
  never,
  DependentSelectEnv
> = Effect.gen(function* () {
  const logger = yield* LoggerTag;
  const location = yield* LocationServiceTag;

  logger.info("location.loadProvinces.start");
  const provinces = yield* Effect.promise(() =>
    location.listProvinces(),
  );
  logger.info("location.loadProvinces.done", { count: provinces.length });
  return provinces;
});

export const onProvinceChangeFlow = (
  provinceCode: string,
): Effect.Effect<
  { cities: City[]; districts: District[] },
  never,
  DependentSelectEnv
> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const location = yield* LocationServiceTag;

    logger.info("location.onProvinceChange", { provinceCode });
    const cities = yield* Effect.promise(() =>
      location.listCities(provinceCode),
    );
    const districts: District[] = [];
    return { cities, districts };
  });

export const onCityChangeFlow = (
  cityCode: string,
): Effect.Effect<District[], never, DependentSelectEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const location = yield* LocationServiceTag;

    logger.info("location.onCityChange", { cityCode });
    const districts = yield* Effect.promise(() =>
      location.listDistricts(cityCode),
    );
    logger.info("location.loadDistricts.done", { count: districts.length });
    return districts;
  });
