const VALID_MISSION_PHASES = new Set(['IDLE', 'SELECTED', 'ACCEPTED', 'EN_ROUTE', 'WORKING', 'COMPLETED', 'FAILED']);
const isFiniteNumber = (v) => Number.isFinite(v);

export function runInvariantChecks(ctx) {
  const { day, prevDay, company, ship, systemsById, contracts, uniqueUiIds = [], activeMissionDays = 0, exportState = null } = ctx;
  const failures = [];
  if (typeof prevDay === 'number' && day !== prevDay + 1) failures.push(`Day increment invalid: expected ${prevDay + 1}, got ${day}`);
  if (!isFiniteNumber(company?.cash)) failures.push('Cash must be a finite number');
  if (!isFiniteNumber(ship?.fuel) || ship.fuel < 0) failures.push('Fuel must be a non-negative number');
  if (!isFiniteNumber(ship?.integrity)) failures.push('Integrity must be a finite number');
  ['engines', 'lifeSupport', 'sensors', 'hull'].forEach((k) => { if (!isFiniteNumber(ship?.compartments?.[k])) failures.push(`Compartment ${k} must be numeric`); });
  if ((company?.crew?.length ?? 0) > (ship?.maxCrew ?? Number.MAX_SAFE_INTEGER)) failures.push('Crew exceeds max crew');
  const phase = ship?.activeContract ? (ship?.travelPlan ? 'EN_ROUTE' : 'ACCEPTED') : 'IDLE';
  if (!VALID_MISSION_PHASES.has(phase)) failures.push(`Invalid mission phase: ${phase}`);
  if (ship?.activeContract && activeMissionDays > 45) failures.push('Active mission appears stuck too long');
  const resolvedCount = (ship?.historyLog ?? []).filter((entry) => String(entry).includes('resolved as')).length;
  if ((ship?.totalMissionsCompleted ?? 0) !== resolvedCount) failures.push('totalMissionsCompleted mismatch with history log');
  if (ship?.travelPlan && (!ship.travelPlan.to || !ship.travelPlan.from)) failures.push('travelState missing required route fields');
  if (!systemsById?.[ship?.location]) failures.push(`Invalid ship location: ${ship?.location}`);
  (contracts ?? []).forEach((contract) => { if (!systemsById?.[contract.origin] || !systemsById?.[contract.destination]) failures.push(`Contract ${contract.id} has invalid origin/destination`); });
  if (uniqueUiIds.length) failures.push(`Duplicate UI IDs detected: ${uniqueUiIds.join(', ')}`);
  if (exportState) ['version', 'day', 'company', 'ships', 'crew', 'eventLog'].forEach((field) => { if (!(field in exportState)) failures.push(`Missing required export field: ${field}`); });
  return failures;
}
