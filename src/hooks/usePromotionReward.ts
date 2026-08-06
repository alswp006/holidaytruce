/**
 * STUB — TDD red phase (packet 0014). Type shape only; Coder implements the real
 * amount>5000 guard around grantPromotionReward. Intentionally returns a fixed
 * value so src/__tests__/packet-0014.test.ts fails on assertions, not on module
 * resolution.
 */
export interface PromotionRewardArgs {
  promotionCode: string;
  amount: number;
}

export interface PromotionRewardOutcome {
  granted: boolean;
  blocked?: boolean;
}

export function usePromotionReward() {
  async function grantReward(_args: PromotionRewardArgs): Promise<PromotionRewardOutcome> {
    return { granted: false };
  }

  return { grantReward };
}
