import { describe, expect, it } from 'vitest'

import { getAgentSchedulingStage } from '../../src/internal/result.js'

describe('nextRecommendedStage precedence', () => {
  it('uses top-level nextRecommendedStage over hint-local upgrades', () => {
    expect(getAgentSchedulingStage({
      nextRecommendedStage: 'trial',
      repairHints: [
        { code: 'x', canAutoRetry: false, upgradeToStage: 'compare', focusRef: null },
      ],
    })).toBe('trial')
  })
})
