# Contract: Diagnostics (O-023)

## Event Requirements

- `run(config)` 诊断必须记录 mode、decision、anchor。
- latest/exhaust/parallel/task 的拒绝与排队都需可解释。
- 事件 payload 必须 slim + serializable。
