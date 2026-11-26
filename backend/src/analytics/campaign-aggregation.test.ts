import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCampaignReports } from "./campaign-aggregation";

test("aggregates same-currency campaign and daily metrics across apps", () => {
  const result = aggregateCampaignReports([
    {
      currency: "USD",
      campaigns: [{
        campaign: "Launch",
        cost: 10,
        clicks: 4,
        impressions: 100,
        trend: [{ date: "2026-01-02", cost: 10, clicks: 4, impressions: 100 }],
      }],
    },
    {
      currency: "USD",
      campaigns: [{
        campaign: "Launch",
        cost: 20,
        clicks: 6,
        impressions: 200,
        trend: [{ date: "2026-01-02", cost: 20, clicks: 6, impressions: 200 }],
      }],
    },
  ]);

  assert.equal(result.totalCost, 30);
  assert.deepEqual(result.campaigns[0], {
    campaign: "Launch",
    cost: 30,
    clicks: 10,
    impressions: 300,
    ctr: 10 / 300,
    cpc: 3,
    trend: [{ date: "2026-01-02", cost: 30, clicks: 10, impressions: 300 }],
  });
  assert.deepEqual(result.trend, [{ date: "2026-01-02", cost: 30, clicks: 10, impressions: 300 }]);
});

test("rejects cross-currency totals and preserves unavailable values", () => {
  assert.throws(() => aggregateCampaignReports([
    { currency: "USD", campaigns: [] },
    { currency: "EUR", campaigns: [] },
  ]), /different currencies/);

  const result = aggregateCampaignReports([{
    currency: "USD",
    campaigns: [{
      campaign: "Unreported",
      cost: null,
      clicks: null,
      impressions: null,
      trend: [],
    }],
  }]);
  assert.equal(result.totalCost, null);
  assert.equal(result.campaigns[0]?.cost, null);
  assert.equal(result.campaigns[0]?.ctr, null);
});
