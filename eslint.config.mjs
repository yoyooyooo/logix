import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import effectPlugin from '@effect/eslint-plugin'
import oxlint from 'eslint-plugin-oxlint'

const tsconfigRootDir = new URL('.', import.meta.url).pathname

// eslint flat config 的 files/ignores 不稳定支持 brace expansion，这里显式展开。
const LINT_FILES = [
  'apps/**/src/**/*.ts',
  'apps/**/src/**/*.tsx',
  'packages/**/src/**/*.ts',
  'packages/**/src/**/*.tsx',
]

const LINT_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/.agent/**',
  '**/.next/**',
  '**/.source/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.vite/**',
  'packages/logix-sandbox/scripts/**',
  '**/public/**',
  'docs/**',
  // 测试文件：先整体排除（避免存量噪声），后续再分包逐步纳入
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
]

const scoped = (config) => ({
  ...config,
  files: LINT_FILES,
  ignores: LINT_IGNORES,
})

export default tseslint.config(
  // 全局忽略
  {
    files: LINT_FILES,
    ignores: LINT_IGNORES,
    linterOptions: {
      // 这条默认以 warning 形式提示“多余的 eslint-disable”，当前仓库存量较多，先关掉降噪
      reportUnusedDisableDirectives: 'off',
    },
  },
  // 只 lint TS/TSX 源码：强制使用 typescript-eslint parser，避免被 espree 当成 JS 解析。
  {
    files: LINT_FILES,
    ignores: LINT_IGNORES,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  // JS 基础规则
  scoped(js.configs.recommended),
  // TS 推荐规则（非 type-aware，匹配当前仓库现状，避免引入大规模 strict typed lint 噪声）
  ...tseslint.configs.recommended.map(scoped),
  // 让 ESLint 关闭 oxlint 已覆盖的规则（避免重复 + 提速）。
  ...oxlint.configs['flat/correctness'].map(scoped),
  // 仓库当前存量里 unused 噪声较大，先交给 TS/IDE 与提交时局部治理。
  {
    files: LINT_FILES,
    ignores: LINT_IGNORES,
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  // 当前仓库仍处在积极演进阶段，允许在边界/胶水层使用 any / namespace 等写法；
  // 等稳定后再逐步收紧到更严格的类型约束。
  {
    files: LINT_FILES,
    ignores: LINT_IGNORES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  // Effect 插件（先只接上插件，规则后面按需要逐步打开）
  {
    files: LINT_FILES,
    ignores: LINT_IGNORES,
    plugins: {
      '@effect': effectPlugin,
    },
    rules: {
      // 先关闭，后续如果不再从 barrel 导入再改成 `"error"`
      '@effect/no-import-from-barrel-package': 'off',
      // dprint 相关规则默认也先关闭，避免和现有格式冲突
      '@effect/dprint': 'off',
    },
  },
  // 针对验证文件，单独开启一条 Effect 规则，方便确认插件生效
  {
    files: ['packages/react/src/effect-language-service-test.ts'],
    rules: {
      '@effect/no-import-from-barrel-package': [
        'error',
        {
          packageNames: ['effect', '@effect/platform', '@effect/schema'],
        },
      ],
    },
  },
  // 测试与构建配置文件：保留类型检查，但放宽部分 any/unknown 相关规则，避免对断言链和 Node 内置模块过度噪声
  {
    files: [
      '**/test/**/*.{ts,tsx}',
      '**/*config.ts',
      '**/*config.cjs',
      '**/vitest.config.ts',
      '**/verify_ref.ts',
      '**/eslint.config.*',
    ],
    ignores: LINT_IGNORES,
    languageOptions: {
      parserOptions: {
        project: false,
      },
      sourceType: 'module',
      globals: {
        module: true,
        require: true,
        URL: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-array-delete': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
)
