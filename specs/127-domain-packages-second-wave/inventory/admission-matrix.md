# Admission Matrix

| Candidate Type | Allowed Role | Allowed | Rejection Reason |
| --- | --- | --- | --- |
| service capability | service-first | yes | 需保持单一 service truth |
| resource/program kit | program-first | yes | 需完全降到 `Module / Logic / Program / Runtime` |
| pattern-kit wrapper | program-first | conditional | wrapper 本身不能成为第三主输出 |
| second runtime / second DI / second txn semantics | none | no | 违反单主线约束 |
