# Stage Matrix

| Stage | Modes | Default Upgrade | Owner Packages | Notes |
| --- | --- | --- | --- | --- |
| `runtime.check` | `static` | `runtime.trial(mode="startup")` | `@logixjs/core`, `@logixjs/cli`, `@logixjs/test` | cheap static gate，不隐式代跑 trial |
| `runtime.trial` | `startup`, `scenario` | `runtime.compare` | `@logixjs/core`, `@logixjs/cli`, `@logixjs/test`, `@logixjs/sandbox` | 运行式验证入口 |
| `runtime.compare` | `compare` | none | `@logixjs/core`, `@logixjs/cli`, `@logixjs/test` | 标准化报告与关键工件对比 |
