import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import glob from "fast-glob";

export type VerifyViolation = {
  readonly code: string;
  readonly message: string;
  readonly packageName?: string;
  readonly filePath?: string;
};

export type VerifyResult = {
  readonly ok: boolean;
  readonly violations: ReadonlyArray<VerifyViolation>;
};

type PackageInfo = {
  readonly packageName: string;
  readonly packageDir: string;
  readonly packageJsonPath: string;
  readonly exportsField: unknown;
  readonly publishExportsField: unknown;
};

type VerifyOptions = {
  readonly checkImports?: boolean;
};

const browserProjectPackages = new Set<string>([
  "@logixjs/react",
  "@logixjs/sandbox",
]);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (filePath: string): unknown =>
  JSON.parse(fs.readFileSync(filePath, "utf-8"));

const normalizeFsPath = (filePath: string): string =>
  filePath.replace(/\\/g, "/");

const isPascalSegment = (segment: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(segment);

const isPascalModuleName = (name: string): boolean => {
  const parts = name.split(".");
  return parts.length > 0 && parts.every(isPascalSegment);
};

const isPublicSubmoduleFileName = (fileName: string): boolean => {
  if (!(fileName.endsWith(".ts") || fileName.endsWith(".tsx"))) return false;
  const base = fileName.endsWith(".tsx")
    ? fileName.slice(0, -".tsx".length)
    : fileName.slice(0, -".ts".length);
  return isPascalModuleName(base);
};

const extractExportTargets = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === "string") return [value];
  if (value === null) return [];
  if (Array.isArray(value)) return value.flatMap(extractExportTargets);
  if (isObjectRecord(value))
    return Object.values(value).flatMap(extractExportTargets);
  return [];
};

const isEmptyModule = (sourceText: string): boolean => {
  const stripped = sourceText
    // Remove block comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove line comments
    .replace(/^\s*\/\/.*$/gm, "")
    // Remove whitespace
    .trim();

  if (stripped.length === 0) return true;
  if (stripped === "export {}") return true;
  if (stripped === "export {};") return true;
  return false;
};

const findPackages = async (
  workspaceRoot: string
): Promise<ReadonlyArray<PackageInfo>> => {
  const packageJsonPaths = await glob("packages/*/package.json", {
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const results: Array<PackageInfo> = [];
  for (const packageJsonPath of packageJsonPaths) {
    const pkg = readJson(packageJsonPath);
    if (!isObjectRecord(pkg)) continue;
    const packageName =
      typeof pkg.name === "string"
        ? pkg.name
        : path.basename(path.dirname(packageJsonPath));
    const packageDir = path.dirname(packageJsonPath);
    const exportsField = pkg.exports;
    const publishExportsField = isObjectRecord(pkg.publishConfig)
      ? pkg.publishConfig.exports
      : undefined;

    results.push({
      packageName,
      packageDir,
      packageJsonPath,
      exportsField,
      publishExportsField,
    });
  }

  return results;
};

const allowedSrcRootDirsFromExports = (
  packageDir: string,
  exportsField: unknown
): ReadonlySet<string> => {
  const allowed = new Set<string>(["internal"]);

  if (!isObjectRecord(exportsField)) return allowed;

  for (const [key, value] of Object.entries(exportsField)) {
    if (!key.startsWith("./")) continue;
    if (key === "./*" || key === "./internal/*" || key === "./package.json")
      continue;

    const name = key.slice("./".length);
    if (!name || name.includes("/") || name.includes("*")) continue;

    const targets = extractExportTargets(value);
    for (const target of targets) {
      if (typeof target !== "string") continue;
      const normalized = target.replace(/\\/g, "/");
      if (
        normalized === `./src/${name}/index.ts` ||
        normalized === `./src/${name}/index.tsx`
      ) {
        const dirPath = path.resolve(packageDir, "src", name);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          allowed.add(name);
        }
      }
    }
  }

  return allowed;
};

const checkSrcRootGovernance = (
  pkg: PackageInfo,
  violations: Array<VerifyViolation>
): void => {
  const srcDir = path.resolve(pkg.packageDir, "src");
  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    violations.push({
      code: "pkg_missing_src_dir",
      packageName: pkg.packageName,
      filePath: srcDir,
      message: "Missing src/ directory",
    });
    return;
  }

  const allowedDirs = allowedSrcRootDirsFromExports(
    pkg.packageDir,
    pkg.exportsField
  );
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      if (allowedDirs.has(name)) continue;
      violations.push({
        code: "src_root_forbidden_dir",
        packageName: pkg.packageName,
        filePath: path.resolve(srcDir, name),
        message: `Forbidden directory in src/ root: ${name}`,
      });
      continue;
    }

    if (entry.isFile()) {
      if (name === "index.ts" || name === "index.tsx" || name === "global.d.ts")
        continue;
      if (isPublicSubmoduleFileName(name)) continue;

      violations.push({
        code: "src_root_forbidden_file",
        packageName: pkg.packageName,
        filePath: path.resolve(srcDir, name),
        message: `Forbidden file in src/ root: ${name} (expected PascalCase(.PascalCase)? .ts/.tsx)`,
      });
      continue;
    }

    violations.push({
      code: "src_root_forbidden_entry",
      packageName: pkg.packageName,
      filePath: path.resolve(srcDir, name),
      message: `Forbidden entry in src/ root: ${name}`,
    });
  }
};

const checkExportsPolicy = (
  pkg: PackageInfo,
  violations: Array<VerifyViolation>
): void => {
  if (!isObjectRecord(pkg.exportsField)) {
    violations.push({
      code: "pkg_exports_not_object",
      packageName: pkg.packageName,
      filePath: pkg.packageJsonPath,
      message: "`package.json#exports` must be an object",
    });
    return;
  }

  const exportsEntries = pkg.exportsField;

  const hasWildcard = Object.prototype.hasOwnProperty.call(
    exportsEntries,
    "./*"
  );
  const internalBlocked = exportsEntries["./internal/*"] === null;

  if (hasWildcard && !internalBlocked) {
    violations.push({
      code: "exports_internal_not_blocked",
      packageName: pkg.packageName,
      filePath: pkg.packageJsonPath,
      message: "Wildcard exports present but missing `./internal/*: null`",
    });
  }

  const wildcardValue = exportsEntries["./*"];
  if (hasWildcard) {
    const targets = extractExportTargets(wildcardValue);
    const ok = targets.some((t) => t === "./src/*.ts" || t === "./src/*.tsx");
    if (!ok) {
      violations.push({
        code: "exports_wildcard_invalid_target",
        packageName: pkg.packageName,
        filePath: pkg.packageJsonPath,
        message:
          "Wildcard export `./*` must target `./src/*.ts` or `./src/*.tsx`",
      });
    }
  }

  for (const [key, value] of Object.entries(exportsEntries)) {
    if (value === null) continue;
    if (key === "./internal/*") continue;
    if (key === "./package.json") continue;

    for (const target of extractExportTargets(value)) {
      if (
        target.includes("src/internal/") ||
        target.includes("src\\internal\\")
      ) {
        violations.push({
          code: "exports_points_to_internal",
          packageName: pkg.packageName,
          filePath: pkg.packageJsonPath,
          message: `Export "${key}" points into src/internal (forbidden): ${target}`,
        });
      }
    }

    if (key === "." || key === "./*") continue;

    const targets = extractExportTargets(value).filter(
      (t) => typeof t === "string"
    );
    if (targets.length === 0) continue;

    const checks: Array<{
      readonly target: string;
      readonly filePath: string;
    }> = [];
    for (const target of targets) {
      if (target === "./package.json") continue;
      if (target.includes("*")) continue;
      const resolved = path.resolve(pkg.packageDir, target);
      checks.push({ target, filePath: resolved });
    }

    for (const check of checks) {
      if (!fs.existsSync(check.filePath)) {
        violations.push({
          code: "exports_target_missing",
          packageName: pkg.packageName,
          filePath: pkg.packageJsonPath,
          message: `Export "${key}" target does not exist: ${check.target}`,
        });
        continue;
      }

      if (check.filePath.endsWith(".ts") || check.filePath.endsWith(".tsx")) {
        const text = fs.readFileSync(check.filePath, "utf-8");
        if (isEmptyModule(text)) {
          violations.push({
            code: "exports_target_empty_module",
            packageName: pkg.packageName,
            filePath: check.filePath,
            message: `Export "${key}" is an empty module (forbidden): ${check.target}`,
          });
        }
      }
    }
  }
};

const checkPublishExportsConsistency = (
  pkg: PackageInfo,
  violations: Array<VerifyViolation>
): void => {
  if (pkg.publishExportsField === undefined) return;

  if (
    !isObjectRecord(pkg.exportsField) ||
    !isObjectRecord(pkg.publishExportsField)
  ) {
    violations.push({
      code: "publish_exports_invalid",
      packageName: pkg.packageName,
      filePath: pkg.packageJsonPath,
      message:
        "`publishConfig.exports` exists but exports are not both objects",
    });
    return;
  }

  const devKeys = new Set(Object.keys(pkg.exportsField));
  const publishKeys = new Set(Object.keys(pkg.publishExportsField));

  const missingInPublish = [...devKeys].filter((k) => !publishKeys.has(k));
  const extraInPublish = [...publishKeys].filter((k) => !devKeys.has(k));

  if (missingInPublish.length === 0 && extraInPublish.length === 0) return;

  const details = [
    missingInPublish.length > 0
      ? `missing: ${missingInPublish.join(", ")}`
      : null,
    extraInPublish.length > 0 ? `extra: ${extraInPublish.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  violations.push({
    code: "publish_exports_mismatch",
    packageName: pkg.packageName,
    filePath: pkg.packageJsonPath,
    message: `publishConfig.exports keys must match exports keys (${details})`,
  });
};

type PackagePathInfo = {
  readonly pkg: PackageInfo;
  readonly packageDirPrefix: string;
  readonly internalDirPrefix: string;
};

const buildPackagePathInfo = (pkg: PackageInfo): PackagePathInfo => {
  const packageDirPrefix = `${normalizeFsPath(pkg.packageDir).replace(
    /\/$/,
    ""
  )}/`;
  const internalDirPrefix = `${normalizeFsPath(
    path.resolve(pkg.packageDir, "src", "internal")
  ).replace(/\/$/, "")}/`;
  return { pkg, packageDirPrefix, internalDirPrefix };
};

const findOwningPackage = (
  filePath: string,
  packages: ReadonlyArray<PackagePathInfo>
): PackagePathInfo | undefined => {
  const normalized = normalizeFsPath(path.resolve(filePath));
  let best: PackagePathInfo | undefined;
  let bestLen = -1;

  for (const pkg of packages) {
    if (
      normalized.startsWith(pkg.packageDirPrefix) &&
      pkg.packageDirPrefix.length > bestLen
    ) {
      best = pkg;
      bestLen = pkg.packageDirPrefix.length;
    }
  }

  return best;
};

const checkNoBypassImports = async (
  workspaceRoot: string,
  packages: ReadonlyArray<PackageInfo>,
  violations: Array<VerifyViolation>
): Promise<void> => {
  const packagePaths = packages.map(buildPackagePathInfo);

  const files = await glob(
    ["{packages,apps,examples,scripts}/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    {
      cwd: workspaceRoot,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/dist/**"],
    }
  );

  const specifierRe =
    /(from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf-8");
    let match: RegExpExecArray | null;
    while ((match = specifierRe.exec(text)) !== null) {
      const spec = match[2];
      if (/^@logixjs\/[^/]+\/internal\//.test(spec)) {
        violations.push({
          code: "import_bypass_internal_subpath",
          filePath,
          message: `Forbidden internal subpath import: ${spec}`,
        });
        continue;
      }

      if (spec.includes("packages/") && spec.includes("/src/internal/")) {
        violations.push({
          code: "import_bypass_packages_src_internal",
          filePath,
          message: `Forbidden deep import into packages/*/src/internal: ${spec}`,
        });
        continue;
      }

      const looksLikeSrcInternal =
        spec.includes("src/internal/") || spec.includes("src\\internal\\");
      if (!looksLikeSrcInternal) continue;

      let resolvedPath: string | undefined;
      if (spec.startsWith("file:")) {
        try {
          resolvedPath = fileURLToPath(spec);
        } catch {
          resolvedPath = undefined;
        }
      } else if (spec.startsWith(".") || path.isAbsolute(spec)) {
        resolvedPath = path.resolve(path.dirname(filePath), spec);
      }

      if (!resolvedPath) continue;

      const targetPkg = findOwningPackage(resolvedPath, packagePaths);
      if (!targetPkg) continue;

      const normalizedResolved = normalizeFsPath(resolvedPath);
      if (!normalizedResolved.startsWith(targetPkg.internalDirPrefix)) continue;

      const importerPkg = findOwningPackage(filePath, packagePaths);
      if (importerPkg?.pkg.packageDir === targetPkg.pkg.packageDir) continue;

      violations.push({
        code: "import_bypass_cross_package_src_internal",
        packageName: importerPkg?.pkg.packageName,
        filePath,
        message: `Forbidden cross-package deep import into ${targetPkg.pkg.packageName}/src/internal: ${spec}`,
      });
    }
  }
};

const checkTestStructure = (
  pkg: PackageInfo,
  violations: Array<VerifyViolation>
): void => {
  const srcDir = path.resolve(pkg.packageDir, "src");
  const testDir = path.resolve(pkg.packageDir, "test");

  const srcTestFiles = glob.sync(
    "src/**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}",
    {
      cwd: pkg.packageDir,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/dist/**"],
    }
  );

  for (const filePath of srcTestFiles) {
    violations.push({
      code: "test_forbidden_under_src",
      packageName: pkg.packageName,
      filePath,
      message: "Test files must not live under src/ (move to test/)",
    });
  }

  if (browserProjectPackages.has(pkg.packageName)) {
    const browserDir = path.resolve(testDir, "browser");
    if (!fs.existsSync(browserDir) || !fs.statSync(browserDir).isDirectory()) {
      violations.push({
        code: "test_browser_dir_missing",
        packageName: pkg.packageName,
        filePath: browserDir,
        message:
          "Package enables Vitest browser project; test/browser/ must exist and remain in place",
      });
    }

    const vitestConfigPath = path.resolve(pkg.packageDir, "vitest.config.ts");
    if (
      !fs.existsSync(vitestConfigPath) ||
      !fs.statSync(vitestConfigPath).isFile()
    ) {
      violations.push({
        code: "test_browser_vitest_config_missing",
        packageName: pkg.packageName,
        filePath: vitestConfigPath,
        message:
          "Package enables Vitest browser project; vitest.config.ts must exist and exclude test/browser/** from the unit project",
      });
    } else {
      const configText = fs.readFileSync(vitestConfigPath, "utf-8");
      if (!configText.includes("test/browser/**")) {
        violations.push({
          code: "test_browser_unit_exclude_missing",
          packageName: pkg.packageName,
          filePath: vitestConfigPath,
          message:
            "Vitest unit project must exclude test/browser/** to avoid running browser tests in the unit project",
        });
      }
    }
  }

  if (!fs.existsSync(testDir) || !fs.statSync(testDir).isDirectory()) return;

  const testFiles = glob.sync("test/**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}", {
    cwd: pkg.packageDir,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  const internalImportRe = /src[\\/]+internal[\\/]+/;

  for (const filePath of testFiles) {
    const text = fs.readFileSync(filePath, "utf-8");
    if (!internalImportRe.test(text)) continue;

    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/test/internal/")) continue;
    if (
      browserProjectPackages.has(pkg.packageName) &&
      normalized.includes("/test/browser/")
    ) {
      continue;
    }

    violations.push({
      code: "test_internal_import_not_scoped",
      packageName: pkg.packageName,
      filePath,
      message:
        "Tests importing src/internal/** must live under test/internal/** (keep internal semantics isolated)",
    });
  }
};

export const verifyWorkspace = async (
  workspaceRoot: string,
  options: VerifyOptions = {}
): Promise<VerifyResult> => {
  const packages = await findPackages(workspaceRoot);

  const violations: Array<VerifyViolation> = [];
  for (const pkg of packages) {
    checkSrcRootGovernance(pkg, violations);
    checkTestStructure(pkg, violations);
    checkExportsPolicy(pkg, violations);
    checkPublishExportsConsistency(pkg, violations);
  }

  if (options.checkImports !== false) {
    await checkNoBypassImports(workspaceRoot, packages, violations);
  }

  return { ok: violations.length === 0, violations };
};

const formatViolation = (v: VerifyViolation): string => {
  const where = [
    v.packageName ? `[${v.packageName}]` : null,
    v.filePath ? v.filePath : null,
  ]
    .filter(Boolean)
    .join(" ");
  const prefix = where.length > 0 ? `${where}: ` : "";
  return `${prefix}${v.code}: ${v.message}`;
};

const main = async (): Promise<void> => {
  const result = await verifyWorkspace(process.cwd());

  if (result.ok) {
    // eslint-disable-next-line no-console
    console.log(
      `[verify:public-submodules] PASS (${result.violations.length} violations)`
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.error(
    `[verify:public-submodules] FAIL (${result.violations.length} violations)`
  );
  for (const v of result.violations) {
    // eslint-disable-next-line no-console
    console.error(`- ${formatViolation(v)}`);
  }
  process.exit(1);
};

const isCliEntry = (): boolean => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  return fileURLToPath(import.meta.url) === path.resolve(argv1);
};

if (isCliEntry()) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[verify:public-submodules] Unexpected error:", e);
    process.exit(1);
  });
}
