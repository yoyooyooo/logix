# Input Contract

| Field | Required | Meaning | Current Status | Notes |
| --- | --- | --- | --- | --- |
| `fixtures/env` | yes | 环境、layer、service override 与 host 预设 | active | 第一版场景级试运行固定入口 |
| `steps` | yes | `dispatch / await / read / call / tick` 等结构化步骤 | active | 不引入平行 DSL |
| `expect` | yes | `equals / includes / exists / count / changed` 等结构化断言 | active | 断言域固定为 state / summary / artifacts / environment |
