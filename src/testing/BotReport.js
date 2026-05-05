export function createBotReport(seed, daysRequested) {
  return { seed, daysRequested, daysCompleted: 0, stopReason: 'NOT_STARTED', finalCash: 0, finalFuel: 0, finalLocation: '', missionsAccepted: 0, missionsCompleted: 0, missionsFailed: 0, totalMissionsCompleted: 0, careerXP: 0, encountersResolved: 0, repairsPerformed: 0, restsPerformed: 0, refuelsPerformed: 0, warnings: [], invariantFailures: [], last50EventLogEntries: [] };
}

export function finalizeBotReport(report, { company, ship }) {
  report.finalCash = company.cash;
  report.finalFuel = ship.fuel;
  report.finalLocation = ship.location;
  report.totalMissionsCompleted = ship.totalMissionsCompleted;
  report.careerXP = company.crew.reduce((sum, crew) => sum + (crew.experience ?? 0), 0);
  report.last50EventLogEntries = (company.eventLog ?? []).slice(0, 50);
  return report;
}
