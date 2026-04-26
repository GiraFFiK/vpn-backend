export type SubscriptionPlanId = "month" | "3months" | "6months" | "year";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  stars: number;
  days: number;
  title: string;
  active: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  month: {
    id: "month",
    stars: 50,
    days: 30,
    title: "1 месяц",
    active: true,
  },
  "3months": {
    id: "3months",
    stars: 130,
    days: 90,
    title: "3 месяца",
    active: true,
  },
  "6months": {
    id: "6months",
    stars: 280,
    days: 180,
    title: "6 месяцев",
    active: false,
  },
  year: {
    id: "year",
    stars: 550,
    days: 365,
    title: "1 год",
    active: false,
  },
};

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] ?? null;
}
