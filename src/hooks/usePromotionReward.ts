import { grantPromotionReward } from "@apps-in-toss/web-framework";

export interface PromotionRewardArgs {
  promotionCode: string;
  amount: number;
}

export interface PromotionRewardOutcome {
  granted: boolean;
  blocked?: boolean;
}

const MAX_PROMOTION_AMOUNT = 5000;

/**
 * grantPromotionReward 래퍼 — amount>5000이면 호출을 차단하고,
 * WebView 밖에서 SDK가 throw해도 조용히 삼켜 흰 화면을 막는다.
 */
export function usePromotionReward() {
  async function grantReward(args: PromotionRewardArgs): Promise<PromotionRewardOutcome> {
    if (args.amount > MAX_PROMOTION_AMOUNT) {
      return { granted: false, blocked: true };
    }

    try {
      // .ai-factory/apps-in-toss-essential.txt 계약 기준 flat 인자 시그니처(설치된 .d.ts는
      // deprecated 별칭이라 { params } 중첩을 요구하지만, 이 프로젝트 SDK 계약은 flat을 그라운드 트루스로 삼는다).
      await grantPromotionReward(
        { promotionCode: args.promotionCode, amount: args.amount } as unknown as Parameters<
          typeof grantPromotionReward
        >[0],
      );
      return { granted: true };
    } catch {
      return { granted: false };
    }
  }

  return { grantReward };
}
