import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  Node,
  Project,
  type Expression,
  type ObjectLiteralExpression,
} from "ts-morph";

type Kind = "form" | "query";

type Options = {
  kind: Kind;
  id: string;
  schemaFile: string;
  schemaExport: string;
  out?: string;
};

function usage(): never {
  console.error(
    [
      "用法:",
      "  pnpm tsx scripts/logix-codegen.ts --kind form  --id MyForm  --schema ./src/schema.ts --export ValuesSchema --out ./src/forms/my-form.ts",
      "  pnpm tsx scripts/logix-codegen.ts --kind query --id MyQuery --schema ./src/schema.ts --export ParamsSchema  --out ./src/queries/my-query.ts",
      "",
      "说明:",
      "  - 本脚本提供“最小可用骨架生成”，重点是产出 FIELD_PATHS 以降低显式 deps 的摩擦；",
      "  - 解析能力目前只覆盖常见的 Schema.Struct / Schema.Array / Schema.optional / Schema.extend / Schema.Union 形态；",
    ].join("\n"),
  );
  process.exit(1);
}

function takeArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  if (!value) return undefined;
  args.splice(idx, 2);
  return value;
}

function parseOptions(argv: string[]): Options {
  const args = argv.slice();
  const kindRaw = takeArg(args, "--kind") ?? "";
  const kind = kindRaw === "form" || kindRaw === "query" ? kindRaw : undefined;
  const id = takeArg(args, "--id") ?? "";
  const schemaFile = takeArg(args, "--schema") ?? "";
  const schemaExport = takeArg(args, "--export") ?? "";
  const out = takeArg(args, "--out");

  if (!kind || !id || !schemaFile || !schemaExport) {
    usage();
  }

  return {
    kind,
    id,
    schemaFile,
    schemaExport,
    out,
  };
}

function toImportPath(fromDir: string, targetFile: string): string {
  const rel = path.relative(fromDir, targetFile);
  const withDot = rel.startsWith(".") ? rel : `./${rel}`;
  const noExt = withDot.replace(/\.(tsx?|mjs|cjs|js)$/, "");
  return noExt.split(path.sep).join("/");
}

function getPropName(p: Node): string | undefined {
  if (Node.isPropertyAssignment(p)) {
    const name = p.getNameNode();
    if (Node.isIdentifier(name)) return name.getText();
    if (Node.isStringLiteral(name)) return name.getLiteralText();
    if (Node.isNumericLiteral(name)) return name.getText();
    return undefined;
  }
  if (Node.isShorthandPropertyAssignment(p)) {
    return p.getName();
  }
  return undefined;
}

function unwrapExpression(expr: Expression): Expression {
  if (Node.isAsExpression(expr) || Node.isSatisfiesExpression(expr)) {
    return unwrapExpression(expr.getExpression());
  }
  if (Node.isParenthesizedExpression(expr)) {
    return unwrapExpression(expr.getExpression());
  }
  return expr;
}

function collectFieldPathsFromSchemaExpr(
  expr: Expression,
  prefix: string,
  out: Set<string>,
): void {
  const e = unwrapExpression(expr);

  if (Node.isCallExpression(e)) {
    const callee = e.getExpression();
    if (Node.isPropertyAccessExpression(callee)) {
      const base = callee.getExpression().getText();
      const name = callee.getName();
      const args = e.getArguments();

      // Schema.optional(x) → x
      if (base === "Schema" && name === "optional" && args[0] && Node.isExpression(args[0])) {
        collectFieldPathsFromSchemaExpr(args[0], prefix, out);
        return;
      }

      // Schema.extend(a, b) → a + b
      if (base === "Schema" && name === "extend") {
        const a = args[0];
        const b = args[1];
        if (a && Node.isExpression(a)) collectFieldPathsFromSchemaExpr(a, prefix, out);
        if (b && Node.isExpression(b)) collectFieldPathsFromSchemaExpr(b, prefix, out);
        return;
      }

      // Schema.Union(a, b, ...) → union(paths(a), paths(b), ...)
      if (base === "Schema" && name === "Union") {
        for (const arg of args) {
          if (arg && Node.isExpression(arg)) {
            collectFieldPathsFromSchemaExpr(arg, prefix, out);
          }
        }
        return;
      }

      // Schema.Array(x) → prefix[] + paths(x, prefix[])
      if (base === "Schema" && name === "Array" && args[0] && Node.isExpression(args[0])) {
        if (prefix) {
          const itemPrefix = `${prefix}[]`;
          out.add(itemPrefix);
          collectFieldPathsFromSchemaExpr(args[0], itemPrefix, out);
        }
        return;
      }

      // Schema.Struct({ ... })
      if (base === "Schema" && name === "Struct" && args[0] && Node.isObjectLiteralExpression(args[0])) {
        const obj = args[0] as ObjectLiteralExpression;
        for (const prop of obj.getProperties()) {
          const key = getPropName(prop);
          if (!key) continue;

          const nextPath = prefix ? `${prefix}.${key}` : key;
          out.add(nextPath);

          if (Node.isPropertyAssignment(prop)) {
            const init = prop.getInitializer();
            if (init && Node.isExpression(init)) {
              collectFieldPathsFromSchemaExpr(init, nextPath, out);
            }
          }
        }
        return;
      }
    }
  }
}

function extractFieldPaths(params: { schemaFile: string; schemaExport: string }): string[] {
  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  const sf = project.addSourceFileAtPath(params.schemaFile);
  const decl = sf.getVariableDeclaration(params.schemaExport);
  if (!decl) return [];
  const init = decl.getInitializer();
  if (!init || !Node.isExpression(init)) return [];

  const out = new Set<string>();
  collectFieldPathsFromSchemaExpr(init, "", out);

  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function renderScaffold(opts: Options, fieldPaths: string[]): string {
  const outDir = opts.out ? path.dirname(path.resolve(opts.out)) : process.cwd();
  const schemaImport = toImportPath(outDir, path.resolve(opts.schemaFile));

  const schemaType =
    opts.kind === "form"
      ? "values"
      : "params";

  const schemaVar =
    opts.kind === "form"
      ? "ValuesSchema"
      : "ParamsSchema";

  const initialVar =
    opts.kind === "form"
      ? "initialValues"
      : "initialParams";

  const initialPlaceholder =
    opts.kind === "form"
      ? "{} as any"
      : "{} as any";

  const makeCall =
    opts.kind === "form"
      ? `Form.make("${opts.id}", {\n  ${schemaType}: ${schemaVar},\n  ${initialVar}: ${initialPlaceholder},\n  traits: Form.traits(${schemaVar})({\n    // TODO: traits\n  }),\n})`
      : `Query.make("${opts.id}", {\n  ${schemaType}: ${schemaVar},\n  ${initialVar}: ${initialPlaceholder},\n  queries: {\n    // TODO: queries\n    example: {\n      resource: { id: "demo/resource" },\n      deps: [],\n      key: (_params, _ui) => undefined,\n    },\n  },\n})`;

  return [
    `import { Schema } from "effect";`,
    opts.kind === "form" ? `import { Form } from "@logix/form";` : `import { Query } from "@logix/query";`,
    "",
    `import { ${opts.schemaExport} as ${schemaVar} } from "${schemaImport}";`,
    "",
    `export const ${opts.id}FieldPaths = [`,
    ...fieldPaths.map((p) => `  "${p}",`),
    `] as const;`,
    "",
    `export type ${opts.id}FieldPath = (typeof ${opts.id}FieldPaths)[number];`,
    "",
    `export const ${opts.id}Blueprint = ${makeCall};`,
    "",
    `// 提示：deps 必须显式声明；可以直接从 ${opts.id}FieldPaths 里复制粘贴，避免漏写/写错。`,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const opts = parseOptions(process.argv.slice(2));
  const schemaAbs = path.resolve(process.cwd(), opts.schemaFile);

  const fieldPaths = extractFieldPaths({
    schemaFile: schemaAbs,
    schemaExport: opts.schemaExport,
  });

  const content = renderScaffold({ ...opts, schemaFile: schemaAbs }, fieldPaths);

  if (opts.out) {
    const outAbs = path.resolve(process.cwd(), opts.out);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    await fs.writeFile(outAbs, content, "utf8");
    return;
  }

  process.stdout.write(content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
