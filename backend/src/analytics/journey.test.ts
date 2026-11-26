import assert from "node:assert/strict";
import test from "node:test";
import { buildJourney } from "./journey";

test("preserves event order and compares adjacent event populations", () => {
  const events = ["open", "submit", "complete"];
  const result = buildJourney(events, new Map([
    ["open", { eventName: "open", activeUsers: 100, eventCount: 150 }],
    ["submit", { eventName: "submit", activeUsers: 75, eventCount: 80 }],
    ["complete", { eventName: "complete", activeUsers: 90, eventCount: 95 }],
  ]));

  assert.deepEqual(result.map((event) => event.eventName), events);
  assert.equal(result[0].dropPercentage, null);
  assert.equal(result[1].dropPercentage, 25);
  assert.equal(result[2].dropPercentage, -20);
});

test("supports features with 50 or more events and nulls drops after a zero population", () => {
  const events = Array.from({ length: 60 }, (_, index) => `event_${index}`);
  const populations = new Map(events.map((eventName, index) => [
    eventName,
    { eventName, activeUsers: index === 0 ? 0 : 25, eventCount: 30 },
  ]));
  const result = buildJourney(events, populations);

  assert.equal(result.length, 60);
  assert.equal(result[0].dropPercentage, null);
  assert.equal(result[1].dropPercentage, null);
  assert.equal(result[59].position, 59);
});
