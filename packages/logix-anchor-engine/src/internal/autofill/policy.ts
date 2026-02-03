import type { JsonValue, ReasonCode, SkipReason } from './model.js'

const defaultMessage: Record<ReasonCode, string> = {
  already_declared: '目标对象已显式声明该锚点（不自动覆盖）',
  unsafe_to_patch: '目标形态不可安全改写（宁可漏不乱补）',
  unsupported_shape: '暂不支持的代码形态（需要迁移到 Platform-Grade 子集）',
  no_confident_usage: '未发现可确定的使用证据（无需补全或需更显式写法）',
  dynamic_or_ambiguous_usage: '使用点存在动态/歧义/多候选（需要显式声明或迁移写法）',
  unresolvable_service_id: '无法推导稳定 serviceId（需要修正 Tag 定义或显式声明）',
  missing_location: '无法获得可靠定位信息（请检查工具链输入）',
  duplicate_step_key: 'workflow 内存在重复 stepKey（必须人工修复；工具拒绝写回）',
  unresolvable_step_key: '无法为缺失 key 的 step 生成确定性候选（请补齐关键字段或改写为子集形态）',
}

export const makeSkipReason = (code: ReasonCode, args?: { readonly message?: string; readonly details?: JsonValue }): SkipReason => ({
  code,
  message: args?.message ?? defaultMessage[code],
  ...(args?.details ? { details: args.details } : null),
})

export const metaReasonCodes = (args: {
  readonly targetId: string
  readonly anchorKind: string
}): ReadonlyArray<string> => [`autofill.target=${args.targetId}`, `autofill.anchor=${args.anchorKind}`]

export const parseMetaReasonCodes = (
  reasonCodes: ReadonlyArray<string>,
): { readonly targetId?: string; readonly anchorKind?: string } => {
  let targetId: string | undefined
  let anchorKind: string | undefined
  for (const c of reasonCodes) {
    if (typeof c !== 'string') continue
    if (c.startsWith('autofill.target=')) targetId = c.slice('autofill.target='.length)
    if (c.startsWith('autofill.anchor=')) anchorKind = c.slice('autofill.anchor='.length)
  }
  return { targetId, anchorKind }
}

