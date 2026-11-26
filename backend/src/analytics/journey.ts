export type EventPopulation = {
  eventName: string;
  activeUsers: number;
  eventCount: number;
};

export type JourneyPoint = EventPopulation & {
  position: number;
  dropPercentage: number | null;
};

export function buildJourney(
  orderedEventNames: string[],
  populations: Map<string, EventPopulation>,
): JourneyPoint[] {
  let previousActiveUsers = 0;
  return orderedEventNames.map((eventName, position) => {
    const current = populations.get(eventName) ?? { eventName, activeUsers: 0, eventCount: 0 };
    const dropPercentage = position > 0 && previousActiveUsers > 0
      ? ((previousActiveUsers - current.activeUsers) / previousActiveUsers) * 100
      : null;
    previousActiveUsers = current.activeUsers;
    return { ...current, position, dropPercentage };
  });
}
