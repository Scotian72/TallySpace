import RNG from './engine/RNG.js';
import GameLoop from './engine/GameLoop.js';
import Company from './engine/Company.js';
import Ship from './engine/Ship.js';
import CrewGenerator from './engine/CrewGenerator.js';
import EventSystem from './engine/EventSystem.js';
import ContractBoard from './engine/ContractBoard.js';
import { GAME_VERSION } from './constants.js';
import { shipTemplates } from './data/ships.js';
import { crewArchetypes } from './data/crewArchetypes.js';
import { traits } from './data/traits.js';
import { systems, systemById } from './data/systems.js';
import UIController from './ui/UIController.js';

const rng = new RNG(424242);
const eventSystem = new EventSystem();
const ui = new UIController();
const crewGenerator = new CrewGenerator({ rng, archetypes: crewArchetypes, traits });
const contractBoard = new ContractBoard({ rng, systemsById: systemById });
const company = new Company({ name: 'TallySpace Logistics', startingCash: 120000 });
const starterShip = new Ship({ ...shipTemplates[0], location: 'new-canaan' });
company.addShip(starterShip);

const gameLoop = new GameLoop({ onDayAdvance(day) { runDailySimulation(day); render(); } });

function setStatus(message) { ui.setStatus(message); }
function log(message) { eventSystem.emitLog(company, message, gameLoop.day); setStatus(message); }

function render() {
  ui.renderState({ day: gameLoop.day, company, systemsById: systemById, contracts: contractBoard.contracts });
}

function generateRecruitmentPool(day) {
  const count = 5;
  const existingNames = new Set(company.crew.map((crew) => crew.name));
  company.availableCrew = crewGenerator.generateUniqueBatch(count, existingNames).slice(0, 5);
  eventSystem.emitLog(company, `Recruitment pool refreshed with ${company.availableCrew.length} candidates.`, day);
}

function assignCaptain(crewMember) {
  if (!crewMember) return;
  company.crew.forEach((member) => member.setCaptainStatus(false));
  crewMember.setCaptainStatus(true);
  starterShip.assignCaptain(crewMember);
  log(`${crewMember.name} assigned as captain.`);
}

function hireCrew(index) {
  const candidate = company.availableCrew[index];
  if (!candidate) return;
  if (company.cash < candidate.wage) return log(`Cannot hire ${candidate.name}: insufficient cash.`);
  const hiredCrew = company.hireCandidate(index);
  log(`Hired ${hiredCrew.name} (${hiredCrew.archetype}) for $${hiredCrew.wage}.`);
  render();
}

function restCrew() {
  if (!company.crew.length) return;
  const restCost = Math.round(company.crew.reduce((sum, c) => sum + c.wage, 0) * 0.65);
  if (company.cash < restCost) return log(`Cannot rest crew: need $${restCost} and have $${company.cash}.`);
  company.cash -= restCost;
  company.crew.forEach((crewMember) => crewMember.rest(rng));
  log(`Crew rested. Cost $${restCost}.`);
  render();
}

function getCurrentSystem() { return systemById[starterShip.location]; }

function refuelShip() {
  const system = getCurrentSystem();
  const missingFuel = starterShip.fuelCapacity - starterShip.fuel;
  if (missingFuel <= 0) return log(`${starterShip.name} fuel tanks already full.`);
  const affordableFuel = Math.floor(company.cash / system.fuelPrice);
  const fuelToBuy = Math.min(missingFuel, affordableFuel);
  if (fuelToBuy <= 0) return log(`Cannot refuel: fuel price is $${system.fuelPrice} and cash is $${company.cash}.`);
  company.cash -= fuelToBuy * system.fuelPrice;
  starterShip.refuel(fuelToBuy);
  log(`Refueled ${starterShip.name} by ${fuelToBuy} at ${system.name} for $${fuelToBuy * system.fuelPrice}.`);
  render();
}

function repairShip() {
  const system = getCurrentSystem();
  if (starterShip.integrity >= 100) return log(`${starterShip.name} integrity already at maximum.`);
  const missing = 100 - starterShip.integrity;
  const pointCost = Math.round(160 * system.repairCostModifier);
  const affordable = Math.floor(company.cash / pointCost);
  const repairPoints = Math.min(missing, affordable);
  if (repairPoints <= 0) return log(`Cannot repair: insufficient cash for ${system.name} yard rates.`);
  const restored = starterShip.repair(repairPoints);
  const cost = restored * pointCost;
  company.cash -= cost;
  log(`Repaired ${starterShip.name} by ${restored} integrity at ${system.name} for $${cost}.`);
  render();
}

function changeShipMode(mode) {
  if (starterShip.setOperationMode(mode)) {
    log(`${starterShip.name} operation mode set to ${mode}.`);
  }
  render();
}

function startTravel(destinationId) {
  const from = getCurrentSystem();
  const to = systemById[destinationId];
  if (!to || !from.connectedSystems.includes(destinationId)) return log('Travel denied: destination is not connected.');
  if (!starterShip.captain) return log(`${starterShip.name} cannot travel: no captain.`);
  if (starterShip.fuel <= 0) return log(`${starterShip.name} cannot travel: no fuel.`);
  if (starterShip.integrity < 20) return log(`${starterShip.name} cannot travel: ship is too damaged.`);

  const navSkill = Math.max(...company.crew.map((c) => c.attributes.navigation));
  const fuelCost = Math.max(5, Math.round(12 - (navSkill - 50) / 12));
  if (starterShip.fuel < fuelCost) return log(`${starterShip.name} cannot travel: requires ${fuelCost} fuel.`);

  const baseDays = rng.int(1, 3);
  const speed = starterShip.getOperationModeModifiers().speedMultiplier;
  const days = Math.max(1, Math.ceil(baseDays / speed));
  starterShip.fuel = Math.max(0, starterShip.fuel - fuelCost);
  starterShip.travelPlan = { from: starterShip.location, to: destinationId, daysRemaining: days, totalDays: days };
  log(`${starterShip.name} departed ${from.name} for ${to.name}. ETA ${days} day(s).`);
}

function acceptContract(contractId) {
  if (starterShip.activeContract) return log('Cannot accept contract: ship already has an active contract.');
  if (!starterShip.captain) return log('Cannot accept contract: assign a captain first.');
  const contract = contractBoard.contracts.find((item) => item.id === contractId);
  if (!contract) return log('Contract no longer available.');
  if (company.crew.length < contract.requiredCrewMinimum) return log(`Contract blocked: need ${contract.requiredCrewMinimum} crew.`);
  if (starterShip.fuel < contract.requiredFuelMinimum) return log(`Contract blocked: need at least ${contract.requiredFuelMinimum} fuel.`);
  if (starterShip.location !== contract.origin) return log('Contract blocked: ship is not at contract origin.');

  starterShip.activeContract = contractBoard.acceptContract(contractId);
  log(`Contract accepted: ${starterShip.activeContract.type} to ${systemById[starterShip.activeContract.destination].name}.`);
  render();
}

function resolveContract(success) {
  const contract = starterShip.activeContract;
  if (!contract) return;
  if (success) {
    const payoutBoost = starterShip.getOperationModeModifiers().payoutMultiplier;
    const recklessBonus = company.crew.some((c) => c.traits.includes('Reckless')) ? 1.05 : 1;
    const cautiousPenalty = company.crew.some((c) => c.traits.includes('Cautious')) ? 0.97 : 1;
    const payout = Math.round(contract.payout * payoutBoost * recklessBonus * cautiousPenalty);
    company.cash += payout;
    company.crew.forEach((crew) => {
      const levelUps = crew.gainExperience(rng.int(25, 45), rng);
      crew.morale = Math.min(100, crew.morale + rng.int(2, 6));
      levelUps.forEach((entry) => eventSystem.emitLog(company, `${crew.name} reached level ${entry.level}; ${entry.stat} +${entry.gain}.`, gameLoop.day));
    });
    log(`Contract complete: ${contract.type}. Earned $${payout}.`);
  } else {
    const damage = rng.int(4, 14);
    starterShip.applyDamage(damage);
    company.crew.forEach((crew) => {
      const moraleLoss = Math.max(1, rng.int(3, 9) - Math.round(crew.resolve / 30));
      crew.morale = Math.max(0, crew.morale - moraleLoss);
    });
    log(`Contract failed: ${contract.type}. Integrity -${damage}. Crew injury report pending.`);
  }
  starterShip.activeContract = null;
}

function processTravelDay() {
  if (!starterShip.travelPlan) return;
  starterShip.travelPlan.daysRemaining -= 1;
  if (starterShip.travelPlan.daysRemaining > 0) return;
  const destination = systemById[starterShip.travelPlan.to];
  starterShip.location = starterShip.travelPlan.to;

  const riskBase = Math.max(5, 100 - destination.security);
  const capCommand = starterShip.captain?.attributes.command ?? 50;
  const captainMitigation = (capCommand - 50) / 3;
  const integrityPenalty = Math.max(0, (80 - starterShip.integrity) * 0.6);
  const recklessPenalty = company.crew.some((c) => c.traits.includes('Reckless')) ? 8 : 0;
  const cautiousBonus = company.crew.some((c) => c.traits.includes('Cautious')) ? -8 : 0;
  const modeRisk = (starterShip.getOperationModeModifiers().riskMultiplier - 1) * 15;
  const risk = Math.max(3, riskBase + integrityPenalty + recklessPenalty + cautiousBonus + modeRisk - captainMitigation);

  if (rng.int(1, 100) <= risk) {
    const damage = rng.int(2, 10);
    starterShip.applyDamage(damage);
    eventSystem.emitLog(company, `Travel incident en route to ${destination.name}: integrity -${damage}.`, gameLoop.day);
  }

  eventSystem.emitLog(company, `${starterShip.name} arrived at ${destination.name}.`, gameLoop.day);
  if (starterShip.activeContract && starterShip.activeContract.destination === destination.id) {
    const successChance = Math.max(20, 90 - starterShip.activeContract.risk + Math.round(capCommand / 5));
    resolveContract(rng.int(1, 100) <= successChance);
  }

  starterShip.travelPlan = null;
}

function serializeGameState() {
  return {
    version: GAME_VERSION,
    day: gameLoop.day,
    currentSystem: starterShip.location,
    systems,
    currentContracts: contractBoard.contracts,
    activeContracts: company.fleet.map((ship) => ({ ship: ship.name, contract: ship.activeContract })),
    company: { cash: company.cash, ships: company.fleet.length, crew: company.crew.length },
    crew: company.crew.map((c) => ({
      name: c.name, archetype: c.archetype, traits: c.traits, experience: c.experience, level: c.level, personalHistory: c.personalHistory,
      rolePreference: c.rolePreference, riskTolerance: c.riskTolerance, discipline: c.discipline, greed: c.greed, hiddenPotential: c.hiddenPotential,
      attributes: { ...c.attributes }, morale: c.morale, fatigue: c.fatigue, loyalty: c.loyalty, wage: c.wage, isCaptain: c.isCaptain
    })),
    ships: company.fleet.map((ship) => ({
      name: ship.name, location: ship.location, fuel: ship.fuel, fuelCapacity: ship.fuelCapacity, integrity: ship.integrity,
      captainAssignment: ship.captain?.name ?? null, operationMode: ship.operationMode, activeContract: ship.activeContract, readiness: ship.getReadiness()
    })),
    eventLog: company.eventLog.slice(0, 300)
  };
}

function createSaveJson() { return JSON.stringify(serializeGameState(), null, 2); }

function downloadExport(saveJson) {
  const blob = new Blob([saveJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tallyspace_save.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportData() {
  const saveJson = createSaveJson();
  downloadExport(saveJson);
  log('Game state exported to tallyspace_save.json.');
}

async function copyExportData() {
  const saveJson = createSaveJson();
  try {
    await navigator.clipboard.writeText(saveJson);
    log('Copied export JSON');
  } catch {
    downloadExport(saveJson);
    log('Clipboard failed — export downloaded');
  }
}

function runDailySimulation(day) {
  if (day % 5 === 0) generateRecruitmentPool(day);
  contractBoard.refreshContracts(day, starterShip.location);

  const wagesToday = company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0);
  company.cash -= wagesToday;
  eventSystem.emitLog(company, `Paid crew wages: $${wagesToday}.`, day);

  const shipCanOperate = starterShip.fuel > 0 && Boolean(starterShip.captain);
  company.crew = company.crew.filter((crewMember) => {
    crewMember.updateDaily(rng, {
      fatigueRange: [2, 6],
      fatigueMultiplier: starterShip.getOperationModeModifiers().fatigueMultiplier,
      isOperating: shipCanOperate,
      moralePenaltyMultiplier: starterShip.fuel > 0 ? 1 : 1.8
    });
    if (crewMember.shouldQuit(rng)) {
      if (crewMember.isCaptain) starterShip.assignCaptain(null);
      eventSystem.emitLog(company, `${crewMember.name} quit due to low morale and pay pressure.`, day);
      return false;
    }
    return true;
  });

  processTravelDay();
}

function bootstrap() {
  eventSystem.subscribe(() => render());
  const initialCrew = crewGenerator.generateBatch(3);
  initialCrew.forEach((crewMember) => company.addCrewMember(crewMember));
  assignCaptain(company.crew.reduce((best, candidate) => (!best || candidate.attributes.command > best.attributes.command ? candidate : best), null));

  generateRecruitmentPool(gameLoop.day);
  contractBoard.refreshContracts(gameLoop.day, starterShip.location);

  ui.setTitle(`TallySpace Simulation — ${GAME_VERSION}`);
  eventSystem.emitLog(company, `TallySpace ${GAME_VERSION} initialized.`, gameLoop.day);
  eventSystem.emitLog(company, `${company.name} founded with $${company.cash}.`, gameLoop.day);
  eventSystem.emitLog(company, `Commissioned ship ${starterShip.name}.`, gameLoop.day);

  ui.bindAdvanceHandlers(() => gameLoop.advanceDay(), () => gameLoop.advanceDays(10));
  ui.bindCrewActions({ onHire: hireCrew, onAssignCaptain: (index) => assignCaptain(company.crew[index]) });
  ui.bindShipActions({ onRestCrew: restCrew, onChangeShipMode: changeShipMode, onRefuelShip: refuelShip, onRepairShip: repairShip, onTravel: startTravel });
  ui.bindContractActions({ onAcceptContract: acceptContract });
  ui.bindExportActions({ onExportData: exportData, onCopyExportData: copyExportData });

  setStatus('Simulation ready.');
  render();
}

bootstrap();
