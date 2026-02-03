# Error Codes: CLI Host（099）

> 本文件裁决 Host 相关错误码的字面值与含义；实现需写入 `CommandResult@v1.error.code`。
> 命名风格沿用 CLI 现有 `CLI_*` 前缀（例如 `CLI_INVALID_INPUT`）。

## 最小集合（v1）

- `CLI_HOST_MISSING_BROWSER_GLOBAL`
  - 含义：检测到入口/依赖在运行期访问了浏览器全局（例如 `window/document/navigator`），但当前 host 未提供。
  - 建议 action：输出 `CliDiagnostics@v1`，提示用 `--host browser-mock` 重跑。

- `CLI_HOST_MISMATCH`
  - 含义：host 与入口依赖不匹配的泛化兜底（不一定能精确识别缺少哪个 global）。
  - 建议 action：输出 `CliDiagnostics@v1`，提示尝试 `--host browser-mock`，或把浏览器专属逻辑移出模块顶层。

## 识别建议（非强制）

实现可以通过匹配常见 `ReferenceError` 文本来识别缺失的浏览器全局，例如：

- `ReferenceError: window is not defined`
- `ReferenceError: document is not defined`
- `ReferenceError: navigator is not defined`

但不得只依赖堆栈字符串作为唯一证据：最终必须收敛为稳定错误码，并输出可执行 action。

