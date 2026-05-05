import Company from './Company.js';
import Ship from './Ship.js';
import CrewMember from './CrewMember.js';
import ContractBoard from './ContractBoard.js';
import { captainArchetypesById } from '../data/captainArchetypes.js';
import { starterShipsById } from '../data/starterShips.js';

const attrDefaults = { command:50,piloting:50,navigation:50,engineering:50,tactical:50,security:50,medical:50,operations:50,negotiation:50,science:50,stewardship:50,administration:50,resolve:50 };

function toCrewMember(model, isCaptain = false) {
  const role = (model.primaryRole || '').toLowerCase();
  return new CrewMember({
    name: model.name.trim(), species: model.species || 'human', archetype: model.archetype || 'Spacer', traits: [...(model.traits || [])],
    attributes: { ...attrDefaults, ...(model.attributes || {}) }, wage: isCaptain ? 0 : Number(model.wage ?? 120), morale: Number(model.morale ?? 70), loyalty: Number(model.loyalty ?? 60), fatigue: Number(model.fatigue ?? 10),
    personalHistory: model.backstory || '', rolePreference: role.includes('engineer') ? 'engineering' : role.includes('navig') || role.includes('pilot') ? 'navigation' : 'command',
    riskTolerance: Number(model.personality?.riskTolerance ?? 50), discipline: Number(model.personality?.discipline ?? 50), greed: Number(model.personality?.greed ?? 50), hiddenPotential: Number(model.personality?.ambition ?? 50)
  });
}

function buildRoleCoverage(shipTemplate, chars) {
  const required = ['Captain','Pilot','Navigator','Chief Engineer'];
  if (shipTemplate.role.includes('survey')) required.push('Science Officer');
  if (shipTemplate.role.includes('patrol')) required.push('Security Chief');
  if (shipTemplate.role.includes('freight')) required.push('Quartermaster');
  const covered = []; const weaklyCovered = []; const missing = [];
  required.forEach((role) => {
    const primary = chars.find((c) => c.primaryRole === role);
    const secondary = chars.find((c) => c.secondaryRole === role);
    if (primary) covered.push({ role, by: primary.name }); else if (secondary) weaklyCovered.push({ role, by: secondary.name }); else missing.push(role);
  });
  return { requiredRoles: required, coveredRoles: covered, weaklyCoveredRoles: weaklyCovered, missingRoles: missing };
}

export function createGameFromSetup({ rng, systemsById, day=1, selectedStarterShipId, captain, friend1, friend2 }) {
  const shipTemplate = starterShipsById[selectedStarterShipId];
  const company = new Company({ name: 'TallySpace Logistics', startingCash: 26000 });
  const contractBoard = new ContractBoard({ rng, systemsById });

  const captainCrew = toCrewMember({ ...captain, primaryRole: 'Captain' }, true);
  captainCrew.setCaptainStatus(true);
  captainCrew.commandStyle = captain.commandStyle || 'Measured';
  captainCrew.primaryRole = 'Captain'; captainCrew.secondaryRole = captain.secondaryRole || 'Navigator'; captainCrew.personality = { ...(captain.personality || {}) };

  const officers = [friend1, friend2].map((model) => {
    const o = toCrewMember(model, false);
    o.primaryRole = model.primaryRole; o.secondaryRole = model.secondaryRole; o.relationship = model.relationship || null; o.personality = { ...(model.personality || {}) };
    return o;
  });

  const starterShip = new Ship({ name: shipTemplate.name, fuel: shipTemplate.startingFuel, fuelCapacity: shipTemplate.fuelCapacity, integrity: Math.round(Object.values(shipTemplate.compartments).reduce((s,c)=>s+c.condition,0)/10), location: 'new-canaan' });
  starterShip.registry = shipTemplate.registry; starterShip.hullClass = shipTemplate.hullClass; starterShip.role = shipTemplate.role;
  starterShip.minCrew = shipTemplate.minCrew; starterShip.maxCrew = shipTemplate.maxCrew; starterShip.optimalCrew = shipTemplate.optimalCrew; starterShip.officerSlots = shipTemplate.officerSlots; starterShip.cargoCapacity = shipTemplate.cargoCapacity; starterShip.quirks = [...shipTemplate.quirks];
  starterShip.compartments = Object.fromEntries(Object.entries(shipTemplate.compartments).map(([k,v])=>[k,v.condition]));
  if (typeof starterShip.compartments.hull !== 'number') starterShip.compartments.hull = starterShip.integrity;
  starterShip.assignCaptain(captainCrew);

  company.addShip(starterShip); company.addCrewMember(captainCrew); officers.forEach((o)=>company.addCrewMember(o));

  const targetCrew = Math.max(shipTemplate.minCrew, Math.round(shipTemplate.optimalCrew * 0.7));
  while(company.crew.length < targetCrew){ company.addCrewMember(new CrewMember({name:`Crew ${company.crew.length+1}`,archetype:'Deckhand',rolePreference:'operations',attributes:{command:45,navigation:45,engineering:45},wage:120,traits:['Steady']})); }
  starterShip.crewCount = company.crew.length;
  contractBoard.refreshContracts(day,'new-canaan');
  const shipRoleCoverage = buildRoleCoverage(shipTemplate, [captain, friend1, friend2]);

  return { playerCharacter: captainCrew, company, starterShip, officers, crewPools: company.crew, startingSystem: 'new-canaan', initialContracts: contractBoard.contracts, contractBoard, shipRoleCoverage, setupChoices: { captain, friend1, friend2, selectedStarterShipId }, startupLogMessages: [`${company.name} founded with $${company.cash}.`,`Captain ${captainCrew.name} took command (${captainCrew.commandStyle}).`,`Commissioned ${starterShip.name} at New Canaan Station.`] };
}
