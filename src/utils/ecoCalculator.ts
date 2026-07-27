// ECO 계산 및 등급 산정 유틸리티

export type EcoTierType = 'seed' | 'sprout' | 'tree' | 'planet';

export interface EcoTierInfo {
  key: EcoTierType;
  name: string;
  emoji: string;
  minScore: number;
  perks: string[];
}

// 🏆 등급별 정의 및 혜택 매트릭스
export const ECO_TIERS: Record<EcoTierType, EcoTierInfo> = {
  seed: {
    key: 'seed',
    name: '기본 회원 (씨앗)',
    emoji: '🌱',
    minScore: 0,
    perks: ['기본 대여 및 요청 기능'],
  },
  sprout: {
    key: 'sprout',
    name: '새싹 회원',
    emoji: '🌿',
    minScore: 100,
    perks: ['보증금 10% 할인 혜택'],
  },
  tree: {
    key: 'tree',
    name: '우수 공유자 (나무)',
    emoji: '🌳',
    minScore: 300,
    perks: ['우선 매칭 권한', '플랫폼 수수료 할인'],
  },
  planet: {
    key: 'planet',
    name: '프리미엄 공유자 (지구)',
    emoji: '🌎',
    minScore: 700,
    perks: ['고가 물품 대여 권한', '신뢰 배지 제공', '한정 프로필 꾸미기'],
  },
};

// 📊 점수에 따른 현재 등급 판정 함수
export function calculateEcoTier(score: number): EcoTierInfo {
  if (score >= 700) return ECO_TIERS.planet;
  if (score >= 300) return ECO_TIERS.tree;
  if (score >= 100) return ECO_TIERS.sprout;
  return ECO_TIERS.seed;
}

// 🎯 행동별 ECO 포인트 산정 로직
export interface EcoRewardResult {
  pointsToAdd: number;
  description: string;
}

export function getEcoReward(
  actionType: 
    | 'transaction_complete' 
    | 'urgent_help' 
    | 'new_category_share' 
    | 'streak_bonus_7' 
    | 'streak_bonus_30',
  meta?: { isSupplier?: boolean; categoryName?: string }
): EcoRewardResult {
  switch (actionType) {
    case 'transaction_complete':
      if (meta?.isSupplier) {
        return { pointsToAdd: 10, description: '물품 공급(대여 완료) 보상' };
      }
      return { pointsToAdd: 3, description: '물품 대여 완료 보상' };

    case 'urgent_help':
      return { pointsToAdd: 20, description: '긴급 요청 신속 해결 보상' };

    case 'new_category_share':
      return { 
        pointsToAdd: 15, 
        description: `새로운 카테고리(${meta?.categoryName || '신규'}) 공유 보너스` 
      };

    case 'streak_bonus_7':
      return { pointsToAdd: 20, description: '7일 연속 활동 보상' };

    case 'streak_bonus_30':
      return { pointsToAdd: 80, description: '30일 연속 활동 보상' };

    default:
      return { pointsToAdd: 0, description: '기타활동' };
  }
}
