import { Effect, Schema, Layer } from "effect";
import { LogicDSL } from "./dsl";

export interface PatternMeta {
  id: string;
  version?: string;
  icon?: string;
  tags?: ReadonlyArray<string>;
}

export interface PatternDef<C, R = never> extends PatternMeta {
  config: Schema.Schema<C, any, any>;
  body: (config: C) => Effect.Effect<void, any, LogicDSL | R>;
}

export interface Pattern<C, R = never> {
  (config: C): Effect.Effect<void, any, LogicDSL | R>;
  meta: PatternMeta & {
    config: Schema.Schema<C, any, any>;
  };
  layer: (config: C) => Layer.Layer<never, any, LogicDSL | R>;
}

// Pattern 命名空间：提供 make 工厂函数
export const Pattern = {
  make: <C, R = never>(def: PatternDef<C, R>): Pattern<C, R> => {
    const fn = (config: C) => def.body(config);
    (fn as Pattern<C, R>).meta = {
      id: def.id,
      version: def.version,
      icon: def.icon,
      tags: def.tags ?? [],
      config: def.config
    };
    (fn as Pattern<C, R>).layer = (config: C) => {
      // 简单实现：将 Effect 包装为 Layer
      return Layer.effectDiscard(def.body(config));
    };
    return fn as Pattern<C, R>;
  }
};
