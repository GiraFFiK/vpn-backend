export type SubscriptionPlanId = "month" | "3months" | "6months" | "year";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  stars: number;
  days: number;
  deviceLimit: number;
  title: string;
  active: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  month: {
    id: "month",
    stars: 60,
    days: 30,
    deviceLimit: 5,
    title: "1 месяц, до 5 устройств",
    active: true,
  },
  "3months": {
    id: "3months",
    stars: 155,
    days: 90,
    deviceLimit: 5,
    title: "3 месяца, до 5 устройств",
    active: true,
  },
  "6months": {
    id: "6months",
    stars: 330,
    days: 180,
    deviceLimit: 5,
    title: "6 месяцев, до 5 устройств",
    active: true,
  },
  year: {
    id: "year",
    stars: 650,
    days: 365,
    deviceLimit: 5,
    title: "1 год, до 5 устройств",
    active: true,
  },
};

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] ?? null;
}
