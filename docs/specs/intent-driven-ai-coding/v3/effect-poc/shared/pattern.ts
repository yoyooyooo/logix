import { Effect, Schema } from "effect";
import { LogicDSL } from "./dsl";

export interface PatternMeta {
  id: string;
  version?: string;
  icon?: string;
  tags?: ReadonlyArray<string>;
}

export interface PatternDef<C> extends PatternMeta {
  config: Schema.Schema<C, any, any>;
  body: (config: C) => Effect.Effect<void, any, LogicDSL>;
}

export interface Pattern<C> {
  (config: C): Effect.Effect<void, any, LogicDSL>;
  meta: PatternMeta & {
    config: Schema.Schema<C, any, any>;
  };
}

// Pattern 工厂函数：包装逻辑并附加元数据，便于静态分析与资产管理
export function definePattern<C>(def: PatternDef<C>): Pattern<C> {
  const fn = (config: C) => def.body(config);
  (fn as Pattern<C>).meta = {
    id: def.id,
    version: def.version,
    icon: def.icon,
    tags: def.tags ?? [],
    config: def.config
  };
  return fn as Pattern<C>;
}
