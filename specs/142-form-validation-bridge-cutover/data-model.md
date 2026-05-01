# Data Model: Form Validation Bridge Cutover

## Normalized Decode Fact

- role: bridge 输入的最小事实
- fields:
  - structural path
  - stable issue code
  - locale-neutral message input
  - optional artifact ref / source anchor

## Decode-Origin Canonical Bridge

- role: submit-lane decode 到 Form truth 的唯一桥接主线

## Submit Fallback Slot

- role: unmappable decode issue 的唯一回收位
