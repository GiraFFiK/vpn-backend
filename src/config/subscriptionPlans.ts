export type SubscriptionPlanId = "test" | "basic" | "pro" | "ultra";
export type SubscriptionPeriod = 1 | 3 | 6 | 12;

type PlanPeriod = { stars: number; days: number };

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  deviceLimit: number;
  title: string;
  visible: boolean;
  purchasable: boolean;
  periods: Partial<Record<SubscriptionPeriod, PlanPeriod>>;
}

// Server-side source of truth for plans and Telegram Stars invoice amounts.
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> =
  {
    test: {
      id: "test",
      deviceLimit: 1,
      title: "Тестовый тариф на 1 месяц",
      visible: true,
      purchasable: true,
      periods: { 1: { stars: 90, days: 30 } },
    },
    basic: {
      id: "basic",
      deviceLimit: 1,
      title: "Базовый тариф",
      visible: true,
      purchasable: false,
      periods: {
        1: { stars: 90, days: 30 },
        3: { stars: 255, days: 90 },
        6: { stars: 480, days: 180 },
        12: { stars: 900, days: 365 },
      },
    },
    pro: {
      id: "pro",
      deviceLimit: 3,
      title: "Про тариф",
      visible: true,
      purchasable: false,
      periods: {
        1: { stars: 135, days: 30 },
        3: { stars: 380, days: 90 },
        6: { stars: 720, days: 180 },
        12: { stars: 1350, days: 365 },
      },
    },
    ultra: {
      id: "ultra",
      deviceLimit: 5,
      title: "Ультра тариф",
      visible: true,
      purchasable: false,
      periods: {
        1: { stars: 180, days: 30 },
        3: { stars: 510, days: 90 },
        6: { stars: 960, days: 180 },
        12: { stars: 1800, days: 365 },
      },
    },
  };

export function getSubscriptionPlan(planId: unknown) {
  return typeof planId === "string"
    ? (SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] ?? null)
    : null;
}

export function getPurchasableSubscriptionPlan(
  planId: unknown,
  period: unknown,
) {
  const plan = getSubscriptionPlan(planId);
  const normalizedPeriod = typeof period === "number" ? period : Number(period);
  if (!plan || !plan.purchasable || ![1, 3, 6, 12].includes(normalizedPeriod))
    return null;
  const details = plan.periods[normalizedPeriod as SubscriptionPeriod];
  return details
    ? { plan, period: normalizedPeriod as SubscriptionPeriod, ...details }
    : null;
}
