import Company from './Company.js';
import Ship from './Ship.js';
import CrewMember from './CrewMember.js';
import ContractBoard from './ContractBoard.js';
import { captainArchetypesById } from '../data/captainArchetypes.js';
import { starterShipsById } from '../data/starterShips.js';

export function createGameFromSetup({ rng, eventSystem, systemsById, day=1, captainName, captainArchetypeId, commandStyle, selectedCompanionIds, selectedStarterShipId, companionCandidates }) {
  const archetype = captainArchetypesById[captainArchetypeId];
  const shipTemplate = starterShipsById[selectedStarterShipId];
  const company = new Company({ name: 'TallySpace Logistics', startingCash: 26000 });
  const contractBoard = new ContractBoard({ rng, systemsById });

  const captain = new CrewMember({ name: captainName.trim(), archetype: archetype.name, traits: [...archetype.traits], rolePreference: 'command', attributes: { command: 55 + (archetype.attributeModifiers.command ?? 0), navigation: 50 + (archetype.attributeModifiers.navigation ?? 0), engineering: 50 + (archetype.attributeModifiers.engineering ?? 0) }, wage: 0, morale: 72, loyalty: 80, fatigue: 12, personalHistory: archetype.background });
  captain.setCaptainStatus(true);
  captain.commandStyle = commandStyle;
  captain.captainArchetypeId = archetype.id;

  const starterShip = new Ship({ name: shipTemplate.name, fuel: shipTemplate.startingFuel, fuelCapacity: shipTemplate.fuelCapacity, integrity: Math.round(Object.values(shipTemplate.compartments).reduce((s,c)=>s+c.condition,0)/10), location: 'new-canaan' });
  starterShip.registry = shipTemplate.registry; starterShip.hullClass = shipTemplate.hullClass; starterShip.role = shipTemplate.role;
  starterShip.minCrew = shipTemplate.minCrew; starterShip.maxCrew = shipTemplate.maxCrew; starterShip.optimalCrew = shipTemplate.optimalCrew; starterShip.officerSlots = shipTemplate.officerSlots; starterShip.cargoCapacity = shipTemplate.cargoCapacity; starterShip.quirks = [...shipTemplate.quirks];
  starterShip.compartments = Object.fromEntries(Object.entries(shipTemplate.compartments).map(([k,v])=>[k,v.condition]));
  starterShip.assignCaptain(captain);

  company.addShip(starterShip);
  company.addCrewMember(captain);

  const officers = companionCandidates.filter((c)=>selectedCompanionIds.includes(c.id)).map((c)=>new CrewMember({name:c.name,species:c.species,archetype:c.archetype,rolePreference:c.rolePreference,traits:c.traits,attributes:c.attributes,wage:c.wage,personalHistory:c.backstory,loyalty:c.loyalty,morale:c.morale,fatigue:c.fatigue}));
  officers.forEach((o)=>company.addCrewMember(o));

  const targetCrew = Math.max(shipTemplate.minCrew, Math.round(shipTemplate.optimalCrew * 0.7));
  while(company.crew.length < targetCrew){
    company.addCrewMember(new CrewMember({name:`Crew ${company.crew.length+1}`,archetype:'Deckhand',rolePreference:'operations',attributes:{command:45,navigation:45,engineering:45},wage:120,traits:['Steady']}));
  }
  starterShip.crewCount = company.crew.length;
  contractBoard.refreshContracts(day,'new-canaan');
  eventSystem.emitLog(company, `${company.name} founded with $${company.cash}.`, day);
  eventSystem.emitLog(company, `Captain ${captain.name} took command (${archetype.name}, ${commandStyle}).`, day);
  eventSystem.emitLog(company, `Commissioned ${starterShip.name} at New Canaan Station.`, day);

  return { playerCharacter: captain, company, starterShip, officers, crewPools: company.crew, startingSystem: 'new-canaan', initialContracts: contractBoard.contracts, contractBoard, setupChoices: { captainArchetypeId, selectedCompanionIds, selectedStarterShipId, commandStyle } };
}
