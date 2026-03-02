# Control Envelope Contract

## 核心原则

1. CLI 输出是控制协议，不是项目语义容器。  
2. 核心字段不可被扩展覆盖。  
3. 结果必须可机读、可序列化、可重放。

## 核心对象

- `ControlCommand`
- `ControlEvent`
- `ControlState`
- `CommandResult@v2`

## 禁止项

- 核心字段出现 `feature/milestone/epic` 等项目语义。  
- 非确定性标识（随机值/时间戳主键）。  
- 不可序列化 payload。
