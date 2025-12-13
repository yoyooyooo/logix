import js from "@eslint/js"
import tseslint from "typescript-eslint"
import effectPlugin from "@effect/eslint-plugin"
import eslintConfigPrettier from "eslint-config-prettier"

const tsconfigRootDir = new URL(".", import.meta.url).pathname

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.min.js",
      "**/.agent/**",
      "**/.next/**",
      "**/.source/**",
      "**/coverage/**",
      "packages/logix-sandbox/scripts/**",
      "**/public/**",
      "apps/docs/**",
      "docs/**",
    ],
  },
  // JS 基础规则
  js.configs.recommended,
  // TS 推荐规则（含类型检查）
  ...tseslint.configs.recommendedTypeChecked,
  // Prettier 关闭所有与格式相关的 ESLint 规则，交给 Prettier 处理
  eslintConfigPrettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir,
      },
    },
  },
  // Effect 插件（先只接上插件，规则后面按需要逐步打开）
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@effect": effectPlugin,
    },
    rules: {
      // 先关闭，后续如果不再从 barrel 导入再改成 `"error"`
      "@effect/no-import-from-barrel-package": "off",
      // dprint 相关规则默认也先关闭，避免和现有格式冲突
      "@effect/dprint": "off",
    },
  },
  // 针对验证文件，单独开启一条 Effect 规则，方便确认插件生效
  {
    files: ["packages/react/src/effect-language-service-test.ts"],
    rules: {
      "@effect/no-import-from-barrel-package": [
        "error",
        {
          packageNames: ["effect", "@effect/platform", "@effect/schema"],
        },
      ],
    },
  },
  // 测试与构建配置文件：保留类型检查，但放宽部分 any/unknown 相关规则，避免对断言链和 Node 内置模块过度噪声
  {
    files: [
      "**/test/**/*.{ts,tsx}",
      "**/*config.ts",
      "**/*config.cjs",
      "**/vitest.config.ts",
      "**/verify_ref.ts",
      "eslint.config.*",
      "prettier.config.*",
    ],
    languageOptions: {
      parserOptions: {
        project: false,
      },
      sourceType: "commonjs",
      globals: {
        module: true,
        require: true,
        URL: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-array-delete": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/no-implied-eval": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  }
)
