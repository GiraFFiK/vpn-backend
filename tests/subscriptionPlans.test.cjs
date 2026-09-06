const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getPurchasableSubscriptionPlan,
  getSubscriptionPlan,
} = require("../dist/config/subscriptionPlans.js");

test("only the test plan for one month is purchasable during testing", () => {
  const trial = getPurchasableSubscriptionPlan("test", 1);
  assert.deepEqual(
    {
      id: trial.plan.id,
      period: trial.period,
      stars: trial.stars,
      days: trial.days,
      devices: trial.plan.deviceLimit,
    },
    { id: "test", period: 1, stars: 90, days: 30, devices: 1 },
  );
  assert.equal(getPurchasableSubscriptionPlan("test", 3), null);
  assert.equal(getPurchasableSubscriptionPlan("basic", 1), null);
  assert.equal(getPurchasableSubscriptionPlan("pro", 6), null);
  assert.equal(getPurchasableSubscriptionPlan("ultra", 12), null);
});

test("future plans remain visible in the server catalogue", () => {
  assert.equal(getSubscriptionPlan("basic").visible, true);
  assert.equal(getSubscriptionPlan("pro").periods[3].stars, 380);
  assert.equal(getSubscriptionPlan("ultra").periods[12].stars, 1800);
});
