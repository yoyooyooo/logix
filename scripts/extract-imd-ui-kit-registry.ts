import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Project, SyntaxKind } from "ts-morph";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | { readonly [k: string]: JsonValue }
  | ReadonlyArray<JsonValue>;

interface UiKitRegistryV1 {
  readonly protocolVersion: "v1";
  readonly kitId: string;
  readonly components: ReadonlyArray<UiKitComponentV1>;
}

interface UiKitComponentV1 {
  readonly componentKey: string;
  readonly tier?: "base" | "ui" | "pro" | "unknown";
  readonly displayName?: string;
  readonly description?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly dependencies?: ReadonlyArray<string>;
  readonly registryDependencies?: ReadonlyArray<string>;
  readonly props?: ReadonlyArray<UiPropV1>;
  readonly events?: ReadonlyArray<UiEventV1>;
  readonly slots?: ReadonlyArray<UiSlotV1>;
  readonly source?: {
    readonly kind: "imd_registry";
    readonly componentId: string;
    readonly files: ReadonlyArray<string>;
  };
  readonly notes?: JsonValue;
}

interface UiPropV1 {
  readonly name: string;
  readonly bindable?: boolean;
  readonly required?: boolean;
  readonly type?: string;
  readonly description?: string;
}

interface UiEventV1 {
  readonly name: string;
  readonly payloadType?: string;
  readonly description?: string;
}

interface UiSlotV1 {
  readonly name: string;
  readonly description?: string;
}

const NON_BINDABLE_PROPS = new Set(["children", "className", "asChild", "style"]);

function usage(): never {
  console.error(
    [
      "用法:",
      "  pnpm tsx scripts/extract-imd-ui-kit-registry.ts --imd-root /path/to/imd --out path/to/output.json",
      "",
      "参数:",
      "  --imd-root <path>         IMD 仓库根目录（例如 /Users/yoyo/projj/git.imile.com/ux/imd）",
      "  --registry-dir <path>     可选，默认 <imd-root>/apps/www2/registry/default/ui",
      "  --kit-id <string>         可选，默认 imd/default-ui",
      "  --component-key-prefix <string> 可选，默认 imd/",
      "  --include <a,b,c>         可选，仅导出指定 componentId（目录名）",
      "  --out <path>              可选，写入文件；不提供则输出到 stdout",
    ].join("\n"),
  );
  process.exit(1);
}

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function toPascalCase(input: string): string {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
}

function guessPrimaryPropsName(componentId: string, available: ReadonlyArray<string>): string | undefined {
  const stripped = componentId.replace(/^(ui|pro|base)-/, "");
  const expected = `${toPascalCase(stripped)}Props`;
  if (available.includes(expected)) return expected;
  if (available.length === 1) return available[0];
  return undefined;
}

function jsDocSummary(node: any): string | undefined {
  const docs = node.getJsDocs?.() as Array<{ getComment(): string | undefined }> | undefined;
  if (!docs?.length) return undefined;
  const parts = docs.map((d) => d.getComment()).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (!parts.length) return undefined;
  return parts.join("\n");
}

function isFunctionLikeTypeNode(typeNode: any): boolean {
  if (!typeNode) return false;
  const kind = typeNode.getKind?.();
  if (kind === SyntaxKind.FunctionType) return true;
  if (kind === SyntaxKind.UnionType || kind === SyntaxKind.IntersectionType) {
    const children = typeNode.getTypeNodes?.() as any[] | undefined;
    return (children ?? []).some((child) => isFunctionLikeTypeNode(child));
  }
  return false;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findEntryFile(componentDir: string): Promise<string | undefined> {
  const candidates = ["index.tsx", "index.ts", "index.jsx", "index.js"];
  for (const name of candidates) {
    const full = path.join(componentDir, name);
    if (await exists(full)) return full;
  }
  return undefined;
}

async function listSourceFiles(componentDir: string): Promise<ReadonlyArray<string>> {
  const entries = await fs.readdir(componentDir, { withFileTypes: true });
  const files: string[] = [];
  for (const ent of entries) {
    if (ent.isDirectory()) continue;
    if (!ent.name.endsWith(".ts") && !ent.name.endsWith(".tsx")) continue;
    files.push(path.join(componentDir, ent.name));
  }
  return files.sort();
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function extractComponentSpec(args: {
  project: Project;
  componentId: string;
  componentKey: string;
  componentDir: string;
  registryDir: string;
}): Promise<UiKitComponentV1 | undefined> {
  const metaPath = path.join(args.componentDir, "meta.json");
  const meta = await readJsonFile<any>(metaPath);
  const entryFile = await findEntryFile(args.componentDir);
  if (!entryFile) return undefined;

  const sourceFiles = await listSourceFiles(args.componentDir);
  const parsed = sourceFiles
    .map((filePath) => args.project.addSourceFileAtPathIfExists(filePath))
    .filter((sf): sf is NonNullable<typeof sf> => Boolean(sf));

  const propsTypes: Array<{
    name: string;
    props: ReadonlyArray<UiPropV1>;
    events: ReadonlyArray<UiEventV1>;
    slots: ReadonlyArray<UiSlotV1>;
  }> = [];

  for (const sf of parsed) {
    for (const itf of sf.getInterfaces()) {
      const name = itf.getName();
      if (!name.endsWith("Props")) continue;

      const props: UiPropV1[] = [];
      const events: UiEventV1[] = [];
      const slots: UiSlotV1[] = [];

      for (const p of itf.getProperties()) {
        const propName = p.getName();
        const required = !p.hasQuestionToken();
        const typeNode = p.getTypeNode();
        const typeText = typeNode?.getText();
        const description = jsDocSummary(p);

        if (propName === "children") {
          slots.push({ name: "children", description });
          continue;
        }

        const isEvent = propName.startsWith("on") || isFunctionLikeTypeNode(typeNode);
        if (isEvent) {
          events.push({
            name: propName,
            payloadType: typeText,
            description,
          });
        } else {
          props.push({
            name: propName,
            bindable: NON_BINDABLE_PROPS.has(propName) ? false : true,
            required,
            type: typeText,
            description,
          });
        }
      }

      propsTypes.push({
        name,
        props: props.sort((a, b) => a.name.localeCompare(b.name)),
        events: events.sort((a, b) => a.name.localeCompare(b.name)),
        slots: slots.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }

  const primaryPropsName = guessPrimaryPropsName(
    args.componentId,
    propsTypes.map((t) => t.name),
  );
  const primary = primaryPropsName ? propsTypes.find((t) => t.name === primaryPropsName) : undefined;

  const rel = (p: string) => path.relative(args.registryDir, p).replaceAll(path.sep, "/");

  return {
    componentKey: args.componentKey,
    tier: args.componentId.startsWith("pro-")
      ? "pro"
      : args.componentId.startsWith("ui-")
        ? "ui"
        : args.componentId.startsWith("base-")
          ? "base"
          : "unknown",
    displayName: undefined,
    description: typeof meta?.description === "string" ? meta.description : undefined,
    tags: Array.isArray(meta?.tags) ? meta.tags : undefined,
    dependencies: Array.isArray(meta?.dependencies) ? meta.dependencies : undefined,
    registryDependencies: Array.isArray(meta?.registryDependencies) ? meta.registryDependencies : undefined,
    props: primary?.props,
    events: primary?.events,
    slots: primary?.slots,
    source: {
      kind: "imd_registry",
      componentId: args.componentId,
      files: [rel(entryFile), ...(sourceFiles.filter((f) => f !== entryFile).map(rel))],
    },
  } satisfies UiKitComponentV1;
}

async function main(): Promise<void> {
  const imdRoot = readArg("--imd-root") ?? process.env.IMD_ROOT ?? process.env.IMD_REPO_ROOT;
  if (!imdRoot) usage();

  const registryDir =
    readArg("--registry-dir") ?? path.join(imdRoot, "apps/www2/registry/default/ui");
  const kitId = readArg("--kit-id") ?? "imd/default-ui";
  const componentKeyPrefix = readArg("--component-key-prefix") ?? "imd/";
  const includeRaw = readArg("--include");
  const include = includeRaw ? new Set(includeRaw.split(",").map((s) => s.trim()).filter(Boolean)) : undefined;
  const out = readArg("--out");

  const entries = await fs.readdir(registryDir, { withFileTypes: true });
  const componentIds = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => (include ? include.has(name) : true))
    .sort();

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      jsx: 4,
      target: 99,
      module: 99,
    },
  });

  const components: UiKitComponentV1[] = [];

  for (const componentId of componentIds) {
    const componentDir = path.join(registryDir, componentId);
    const componentKey = `${componentKeyPrefix}${componentId}`;
    const spec = await extractComponentSpec({
      project,
      componentId,
      componentKey,
      componentDir,
      registryDir,
    });
    if (spec) components.push(spec);
  }

  const registry: UiKitRegistryV1 = {
    protocolVersion: "v1",
    kitId,
    components: components.sort((a, b) => a.componentKey.localeCompare(b.componentKey)),
  };

  const json = JSON.stringify(registry, null, 2);
  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, `${json}\n`, "utf8");
  } else {
    process.stdout.write(`${json}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
