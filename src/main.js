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
import { species } from './data/species.js';

const rng = new RNG(424242);
const eventSystem = new EventSystem();
const ui = new UIController();
const crewGenerator = new CrewGenerator({ rng, archetypes: crewArchetypes, traits });
const contractBoard = new ContractBoard({ rng, systemsById: systemById });
const company = new Company({ name: 'TallySpace Logistics', startingCash: 26000 });
const starterShip = new Ship({ ...shipTemplates[0], location: 'new-canaan', fuel: 62 });
starterShip.minCrew = 3;
starterShip.maxCrew = 8;
starterShip.crewCount = 0;
starterShip.compartments = { engines: 72, lifeSupport: 76, sensors: 81, hull: 84 };
starterShip.integrity = 84;
starterShip.quirks = ['Fuel Inefficient'];
company.addShip(starterShip);

const gameLoop = new GameLoop({ onDayAdvance(day) { runDailySimulation(day); render(); } });
const financeLedger = new Map();
let selectedContractId = null;

function ensureLedger(day) {
  if (!financeLedger.has(day)) {
    financeLedger.set(day, { income: 0, wages: 0, fuel: 0, repair: 0, otherExpense: 0 });
  }
  return financeLedger.get(day);
}

function trackFinance(day, { income = 0, wages = 0, fuel = 0, repair = 0, otherExpense = 0 } = {}) {
  const row = ensureLedger(day);
  row.income += income;
  row.wages += wages;
  row.fuel += fuel;
  row.repair += repair;
  row.otherExpense += otherExpense;
}

function getRecentSum(key, window = 10) {
  let total = 0;
  const fromDay = Math.max(1, gameLoop.day - window + 1);
  for (let day = fromDay; day <= gameLoop.day; day += 1) {
    total += financeLedger.get(day)?.[key] ?? 0;
  }
  return total;
}

function computeStatus(ship) {
  if (ship.integrity < 35) return 'DAMAGED';
  if (company.crew.length < starterShip.minCrew) return 'LOW CREW';
  if (ship.fuel <= 0) return 'NO FUEL';
  if (ship.travelPlan) return 'TRAVELING';
  if (ship.activeContract) return 'ON CONTRACT';
  return 'IDLE';
}

function buildAlerts() {
  const alerts = [];
  const dailyBurn = company.crew.reduce((sum, c) => sum + c.wage, 0);
  const avgMorale = company.crew.length ? Math.round(company.crew.reduce((sum, c) => sum + c.morale, 0) / company.crew.length) : 0;
  const highFatigue = company.crew.some((crew) => crew.fatigue >= 80);
  const topContract = contractBoard.contracts.find((c) => c.id === selectedContractId);

  if (!starterShip.activeContract) alerts.push({ level: 'critical', label: '🔴 CRITICAL', message: `No active contract — losing $${dailyBurn}/day` });
  if (!starterShip.captain) alerts.push({ level: 'critical', label: '🔴 CRITICAL', message: 'No captain assigned' });
  if (starterShip.fuel <= 0) alerts.push({ level: 'critical', label: '🔴 CRITICAL', message: 'Fuel depleted — ship stranded' });
  if (highFatigue) alerts.push({ level: 'warning', label: '🟡 WARNING', message: 'Crew fatigue high' });
  if (avgMorale <= 42) alerts.push({ level: 'warning', label: '🟡 WARNING', message: 'Morale dropping' });
  if (topContract && topContract.risk >= 70) alerts.push({ level: 'warning', label: '🟡 WARNING', message: 'High risk contract selected' });

  const latest = company.eventLog[0] ?? '';
  if (latest.includes('Contract complete')) alerts.push({ level: 'info', label: '🟢 INFO', message: 'Contract completed successfully' });
  if (latest.includes('reached level')) alerts.push({ level: 'info', label: '🟢 INFO', message: 'Crew leveled up' });

  if (!alerts.length) alerts.push({ level: 'info', label: '🟢 INFO', message: 'Systems stable — ready for next move' });
  return alerts.slice(0, 4);
}

function getMetrics() {
  const dailyWages = company.crew.reduce((sum, c) => sum + c.wage, 0);
  const dailyFuel = Math.round(starterShip.dailyFuelConsumption * (starterShip.fuel > 0 ? 4 : 0));
  const maintenance = Math.round((100 - starterShip.integrity) * 4);
  const dailyBurn = dailyWages + dailyFuel + maintenance;
  const netIncome10Days = getRecentSum('income') - getRecentSum('wages') - getRecentSum('fuel') - getRecentSum('repair') - getRecentSum('otherExpense');
  const recentFuelCost = getRecentSum('fuel');
  const recentRepairCost = getRecentSum('repair');

  const currentSystem = systemById[starterShip.location];
  const selectedContract = contractBoard.contracts.find((contract) => contract.id === selectedContractId);
  const commandState = computeStatus(starterShip);

  let progressPercent = 0;
  let travelHeadline = 'Awaiting orders.';
  let travelEta = '';
  if (starterShip.travelPlan) {
    const destination = systemById[starterShip.travelPlan.to];
    progressPercent = ((starterShip.travelPlan.totalDays - starterShip.travelPlan.daysRemaining) / starterShip.travelPlan.totalDays) * 100;
    travelHeadline = `EN ROUTE TO ${destination.name.toUpperCase()}`;
    travelEta = `ETA: ${starterShip.travelPlan.daysRemaining} day(s)`;
  } else if (starterShip.activeContract) {
    const destination = systemById[starterShip.activeContract.destination];
    const total = starterShip.activeContract.durationDays;
    const remaining = starterShip.travelPlan?.daysRemaining ?? total;
    progressPercent = ((total - remaining) / total) * 100;
    travelHeadline = `MISSION TARGET: ${destination.name.toUpperCase()}`;
    travelEta = `Contract window: ${remaining} day(s) estimated`;
  } else if (selectedContract) {
    const destination = systemById[selectedContract.destination];
    travelHeadline = `MISSION PREP: ${currentSystem.name} → ${destination.name}`;
    travelEta = `Estimated: ${selectedContract.durationDays} day(s)`;
  }

  let netProjection = `You are losing money (-$${dailyBurn.toLocaleString()}/day)`;
  let netProjectionType = 'warn';
  if (starterShip.activeContract) {
    const projectedProfit = starterShip.activeContract.payout - (dailyBurn * starterShip.activeContract.durationDays);
    if (projectedProfit >= 0) {
      netProjection = `This contract will net +$${projectedProfit.toLocaleString()} profit`;
      netProjectionType = 'good';
    } else {
      netProjection = `This contract will lose -$${Math.abs(projectedProfit).toLocaleString()}`;
    }
  }

  const dailyNetEstimate = Math.max(1, dailyBurn + Math.round((recentFuelCost + recentRepairCost) / 10));
  const bankruptcyDays = company.cash > 0 ? Math.floor(company.cash / dailyNetEstimate) : 0;
  const bankruptProjection = company.cash <= 0
    ? 'Bankrupt now — immediate action required.'
    : `At current rate: bankrupt in ${bankruptcyDays} days`;

  return {
    dailyWages,
    dailyBurn,
    recentFuelCost,
    recentRepairCost,
    netIncome10Days,
    bankruptProjection,
    commandState,
    dailyFuel,
    maintenance,
    progressPercent,
    travelHeadline,
    travelEta,
    netProjection,
    netProjectionType,
    alerts: buildAlerts()
  };
}


function getCrewPoolData() {
  const pools = { engineering: [], navigation: [], command: [] };
  company.crew.forEach((crew) => {
    const bestRole = crew.attributes.engineering >= crew.attributes.navigation && crew.attributes.engineering >= crew.attributes.command
      ? 'engineering'
      : crew.attributes.navigation >= crew.attributes.command
        ? 'navigation'
        : 'command';
    pools[bestRole].push(crew);
  });

  return Object.entries(pools).map(([name, members]) => {
    const speciesBreakdown = members.reduce((acc, member) => {
      const key = member.species ?? 'human';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const weightedModifiers = {};
    members.forEach((member) => {
      const mods = member.speciesModifiers ?? {};
      Object.entries(mods).forEach(([key, value]) => {
        weightedModifiers[key] = (weightedModifiers[key] ?? 0) + value / Math.max(1, members.length);
      });
    });
    return { name, count: members.length, speciesBreakdown, weightedModifiers };
  });
}


function getCrewEfficiency() {
  const optimal = Math.max(starterShip.minCrew, 1);
  const levelVsOptimal = Math.min(1.2, company.crew.length / optimal);
  const moraleFactor = company.crew.length ? company.crew.reduce((a,c)=>a+c.morale,0)/(company.crew.length*100) : 0;
  const fatigueFactor = company.crew.length ? 1 - (company.crew.reduce((a,c)=>a+c.fatigue,0)/(company.crew.length*130)) : 0;
  const speciesFactor = company.crew.length ? company.crew.reduce((a,c)=> a + (1 + ((c.speciesModifiers.performanceConsistency ?? 0) + (c.speciesModifiers.damageControl ?? 0))/4),0)/company.crew.length : 1;
  return Math.max(0.3, Number((levelVsOptimal * moraleFactor * fatigueFactor * speciesFactor).toFixed(2)));
}

function processSpeciesFriction(day) {
  const crewSpecies = new Set(company.crew.map((c) => c.species));
  if (crewSpecies.has('mammalian') && crewSpecies.has('reptilian') && rng.int(1, 100) <= 10) {
    company.crew.forEach((c) => { c.morale = Math.max(0, c.morale - 1); });
    eventSystem.emitLog(company, 'Minor crew friction: mammalian and reptilian teams clashed.', day);
  }
  if (crewSpecies.has('reptilian') && crewSpecies.has('avian') && rng.int(1, 100) <= 8) {
    company.crew.forEach((c) => { c.morale = Math.max(0, c.morale - 1); });
    eventSystem.emitLog(company, 'Minor distrust reported between reptilian and avian crew.', day);
  }
  if (crewSpecies.has('amphibian') && starterShip.integrity < 70 && rng.int(1, 100) <= 18) {
    company.crew.filter((c) => c.species === 'amphibian').forEach((c) => { c.morale = Math.max(0, c.morale - 2); });
    eventSystem.emitLog(company, 'Amphibian crew morale dipped due to poor ship condition.', day);
  }
}

function setStatus(message) { ui.setStatus(message); }
function log(message) { eventSystem.emitLog(company, message, gameLoop.day); setStatus(message); }

function render() {
  ui.renderState({ day: gameLoop.day, company, systemsById: systemById, contracts: contractBoard.contracts, metrics: getMetrics(), selectedContractId });
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
  if (company.crew.length >= starterShip.maxCrew) return log('Cannot hire: crew capacity reached');
  if (company.cash < candidate.wage) return log(`Cannot hire ${candidate.name}: insufficient cash.`);
  const hiredCrew = company.hireCandidate(index);
  trackFinance(gameLoop.day, { otherExpense: hiredCrew.wage });
  log(`Hired ${hiredCrew.name} (${hiredCrew.archetype}, ${species[hiredCrew.species]?.name ?? 'Human'}) for $${hiredCrew.wage}.`);
  render();
}

function restCrew() {
  if (!company.crew.length) return;
  const restCost = Math.round(company.crew.reduce((sum, c) => sum + c.wage, 0) * 0.65);
  if (company.cash < restCost) return log(`Cannot rest crew: need $${restCost} and have $${company.cash}.`);
  company.cash -= restCost;
  trackFinance(gameLoop.day, { otherExpense: restCost });
  company.crew.forEach((crewMember) => {
    crewMember.rest(rng);
    if (crewMember.species === 'mammalian') eventSystem.emitLog(company, 'Mammalian crew morale improved after rest.', gameLoop.day);
  });
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
  const spend = fuelToBuy * system.fuelPrice;
  trackFinance(gameLoop.day, { fuel: spend });
  log(`Refueled ${starterShip.name} by ${fuelToBuy} at ${system.name} for $${spend}.`);
  render();
}

function repairShip() {
  const system = getCurrentSystem();
  const totalDamage = Object.values(starterShip.compartments).reduce((a,v)=>a+(100-v),0);
  if (totalDamage <= 0) return log('Ship compartments already fully repaired.');
  const engineer = company.crew.reduce((best,c)=> c.attributes.engineering>(best?.attributes.engineering??0)?c:best, null);
  const eff = Math.max(0.7, Math.min(1.5, (engineer?.attributes.engineering ?? 45)/70 * (company.crewEfficiency ?? 1)));
  const pointCost = Math.round(140 * system.repairCostModifier);
  const affordable = Math.floor(company.cash / pointCost);
  const repairPoints = Math.min(totalDamage, Math.round(affordable * eff));
  if (repairPoints <= 0) return log('Cannot repair: insufficient cash for yard rates.');
  const restored = starterShip.repairCompartments(repairPoints);
  const cost = restored * pointCost;
  company.cash -= cost;
  trackFinance(gameLoop.day, { repair: cost });
  log(`Perform Repairs: restored ${restored} compartment points at ${system.name} for $${cost}.`);
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

  if (company.crew.length < starterShip.minCrew) return log('Ship cannot launch: insufficient crew');
  const navSkill = Math.max(...company.crew.map((c) => c.attributes.navigation));
  const navigator = company.crew.reduce((best,c)=> c.attributes.navigation>(best?.attributes.navigation??0)?c:best, null);
  const navOfficerBonus = navigator ? Math.max(0, (navigator.attributes.navigation-55)/30) : 0;
  const damagePenalty = (100 - starterShip.compartments.engines) / 20;
  const quirkPenalty = starterShip.quirks.includes('Fuel Inefficient') ? 1.2 : 1;
  const fuelCost = Math.max(5, Math.round((12 - (navSkill - 50) / 12 + damagePenalty) * quirkPenalty * (1 - navOfficerBonus)));
  if (starterShip.fuel < fuelCost) return log(`${starterShip.name} cannot travel: requires ${fuelCost} fuel.`);

  const baseDays = rng.int(1, 3);
  const speed = starterShip.getOperationModeModifiers().speedMultiplier;
  const days = Math.max(1, Math.ceil(baseDays / speed));
  starterShip.fuel = Math.max(0, starterShip.fuel - fuelCost);
  starterShip.travelPlan = { from: starterShip.location, to: destinationId, daysRemaining: days, totalDays: days };
  log(`${starterShip.name} departed ${from.name} for ${to.name}. ETA ${days} day(s).`);
  render();
}

function selectContract(contractId) {
  selectedContractId = contractId;
  const contract = contractBoard.contracts.find((item) => item.id === contractId);
  if (contract) {
    log(`Mission selected: ${contract.type} to ${systemById[contract.destination].name}.`);
  }
  render();
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
  selectedContractId = null;
  log(`Contract accepted: ${starterShip.activeContract.type} to ${systemById[starterShip.activeContract.destination].name}.`);
  render();
}

function resolveContract(result) {
  const contract = starterShip.activeContract;
  if (!contract) return;
  if (result === 'SUCCESS') {
    const payoutBoost = starterShip.getOperationModeModifiers().payoutMultiplier;
    const recklessBonus = company.crew.some((c) => c.traits.includes('Reckless')) ? 1.05 : 1;
    const cautiousPenalty = company.crew.some((c) => c.traits.includes('Cautious')) ? 0.97 : 1;
    const payout = Math.round(contract.payout * payoutBoost * recklessBonus * cautiousPenalty);
    company.cash += payout;
    trackFinance(gameLoop.day, { income: payout });
    company.crew.forEach((crew) => {
      const levelUps = crew.gainExperience(rng.int(25, 45), rng);
      crew.morale = Math.min(100, crew.morale + rng.int(2, 6));
      levelUps.forEach((entry) => eventSystem.emitLog(company, `${crew.name} reached level ${entry.level}; ${entry.stat} +${entry.gain}.`, gameLoop.day));
    });
    log(`Contract complete: ${contract.type}. Earned $${payout}.`);
  } else if (result === 'PARTIAL') {
    const payout = Math.round(contract.payout * 0.55);
    company.cash += payout;
    trackFinance(gameLoop.day, { income: payout });
    company.crew.forEach((crew) => { crew.fatigue = Math.min(100, crew.fatigue + rng.int(4, 10)); });
    if (rng.int(1,100)<=35) starterShip.applyCompartmentDamage('engines', rng.int(1,4));
    log(`Contract partial: ${contract.type}. Earned $${payout}. Crew fatigue increased.`);
  } else {
    const damage = rng.int(4, 14);
    starterShip.applyDamage(damage);
    starterShip.applyCompartmentDamage('hull', Math.max(1, Math.floor(damage/2)));
    company.crew.forEach((crew) => {
      const moraleLoss = Math.max(1, rng.int(3, 9) - Math.round(crew.resolve / 30));
      crew.morale = Math.max(0, crew.morale - moraleLoss);
    });
    log(`Contract failed: ${contract.type}. Integrity -${damage}. Crew injury report pending.`);
  }
  starterShip.totalMissionsCompleted += 1;
  starterShip.historyLog.unshift(`Day ${gameLoop.day}: ${contract.type} resolved as ${result}.`);
  starterShip.activeContract = null;
}

function processTravelDay() {
  if (!starterShip.travelPlan) return;
  const transitNarratives = ['Routine transit', 'Minor system fluctuation', 'Crew tension rising'];
  const narrative = transitNarratives[rng.int(0, transitNarratives.length - 1)];
  eventSystem.emitLog(company, `${narrative}.`, gameLoop.day);

  if (rng.int(1, 100) <= 22) {
    const eventRoll = rng.int(1, 3);
    if (eventRoll === 1) {
      const moraleShift = rng.int(-4, 3);
      company.crew.forEach((c) => { c.morale = Math.max(0, Math.min(100, c.morale + moraleShift)); });
      eventSystem.emitLog(company, `Minor event: morale shift ${moraleShift >= 0 ? '+' : ''}${moraleShift}.`, gameLoop.day);
    } else if (eventRoll === 2) {
      const fatigueSpike = rng.int(4, 10);
      company.crew.forEach((c) => { c.fatigue = Math.min(100, c.fatigue + fatigueSpike); });
      eventSystem.emitLog(company, `Minor event: fatigue spike +${fatigueSpike}.`, gameLoop.day);
    } else {
      const repairNeed = rng.int(1, 4);
      starterShip.applyDamage(repairNeed);
      eventSystem.emitLog(company, `Minor event: systems wear, integrity -${repairNeed}.`, gameLoop.day);
    }
  }

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
    starterShip.applyCompartmentDamage('hull', Math.max(1, Math.floor(damage/2)));
    eventSystem.emitLog(company, `Travel incident en route to ${destination.name}: integrity -${damage}.`, gameLoop.day);
  }

  eventSystem.emitLog(company, `${starterShip.name} arrived at ${destination.name}.`, gameLoop.day);
  if (starterShip.activeContract && starterShip.activeContract.destination === destination.id) {
    const successChance = Math.max(20, 90 - starterShip.activeContract.risk + Math.round(capCommand / 5));
    const roll = rng.int(1,100);
    const result = roll <= successChance ? 'SUCCESS' : roll <= successChance + 20 ? 'PARTIAL' : 'FAILURE';
    resolveContract(result);
  }

  starterShip.travelPlan = null;
}

const SAVE_KEY = 'tallyspace.v1.save';

function saveGame() {
  localStorage.setItem(SAVE_KEY, createSaveJson());
  log('Game saved to local storage.');
}

function loadGame() {
  const payload = localStorage.getItem(SAVE_KEY);
  if (!payload) return log('No save found in local storage.');
  log('Save found. Reloading session from latest save.');
  location.reload();
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  log('Saved game data cleared.');
}

function openDevToolsPanel() {
  document.querySelector('[data-tab="dev-tools"]')?.click();
  log('Dev Tools tab opened.');
}

function setupNewGameFlow() {
  if (company.eventLog.length > 3) {
    const proceed = window.confirm('Start a new game? Unsaved progress will be lost.');
    if (!proceed) return log('New game canceled.');
  }
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function serializeGameState() {
  return {
    version: GAME_VERSION,
    day: gameLoop.day,
    currentSystem: starterShip.location,
    systems,
    currentContracts: contractBoard.contracts,
    activeContracts: company.fleet.map((ship) => ({ ship: ship.name, contract: ship.activeContract })),
    company: { cash: company.cash, ships: company.fleet.length, crew: company.crew.length, crewPools: getCrewPoolData(), crewEfficiency: company.crewEfficiency ?? 0, speciesModifiersApplied: company.crew.map((c)=>({name:c.name,species:c.species,mods:c.speciesModifiers})) },
    crew: company.crew.map((c) => ({
      name: c.name, archetype: c.archetype, traits: c.traits, experience: c.experience, level: c.level, personalHistory: c.personalHistory,
      rolePreference: c.rolePreference, riskTolerance: c.riskTolerance, discipline: c.discipline, greed: c.greed, hiddenPotential: c.hiddenPotential,
      attributes: { ...c.attributes }, morale: c.morale, fatigue: c.fatigue, loyalty: c.loyalty, wage: c.wage, isCaptain: c.isCaptain,
      species: c.species, speciesModifiers: c.speciesModifiers
    })),
    ships: company.fleet.map((ship) => ({
      name: ship.name, location: ship.location, fuel: ship.fuel, fuelCapacity: ship.fuelCapacity, integrity: ship.integrity,
      captainAssignment: ship.captain?.name ?? null, operationMode: ship.operationMode, activeContract: ship.activeContract, readiness: ship.getReadiness(), historyLog: ship.historyLog, quirks: ship.quirks, compartments: ship.compartments, totalMissionsCompleted: ship.totalMissionsCompleted, totalDamageTaken: ship.totalDamageTaken, repairsPerformed: ship.repairsPerformed, crewDeaths: ship.crewDeaths
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
  ensureLedger(day);
  if (day % 5 === 0) generateRecruitmentPool(day);
  contractBoard.refreshContracts(day, starterShip.location);

  const wagesToday = company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0);
  company.cash -= wagesToday;
  trackFinance(day, { wages: wagesToday });
  eventSystem.emitLog(company, `Paid crew wages: $${wagesToday}.`, day);

  const shipCanOperate = starterShip.fuel > 0 && Boolean(starterShip.captain);
  company.crew = company.crew.filter((crewMember) => {
    crewMember.updateDaily(rng, {
      fatigueRange: [2, 6],
      fatigueMultiplier: starterShip.getOperationModeModifiers().fatigueMultiplier,
      isOperating: shipCanOperate,
      moralePenaltyMultiplier: starterShip.fuel > 0 ? 1 : 1.8,
      shipIntegrity: starterShip.integrity,
      role: crewMember.rolePreference
    });
    if (crewMember.species === 'reptilian' && crewMember.fatigue >= 70 && rng.int(1, 100) <= 8) eventSystem.emitLog(company, 'Reptilian crew maintained stable performance under stress.', day);
    if (crewMember.species === 'avian' && crewMember.rolePreference === 'navigation' && rng.int(1, 100) <= 8) eventSystem.emitLog(company, 'Avian navigator improved route efficiency.', day);
    if (crewMember.species === 'rock' && starterShip.integrity < 60 && rng.int(1, 100) <= 10) eventSystem.emitLog(company, 'Rock-based crew contained structural damage effectively.', day);
    if (crewMember.shouldQuit(rng)) {
      if (crewMember.isCaptain) starterShip.assignCaptain(null);
      eventSystem.emitLog(company, `${crewMember.name} quit due to low morale and pay pressure.`, day);
      return false;
    }
    return true;
  });

  const crewEfficiency = getCrewEfficiency();
  company.crewEfficiency = crewEfficiency;
  if (crewEfficiency < 0.7) eventSystem.emitLog(company, 'Crew efficiency reduced by fatigue/morale pressure.', day);
  if (company.crew.some((c)=>c.fatigue>=90)) eventSystem.emitLog(company, 'Crew fatigue critical warning.', day);
  if (company.crew.some((c)=>c.morale<=12)) eventSystem.emitLog(company, 'Desertion warning: morale collapse risk detected.', day);
  if (rng.int(1,100)<=18) {
    const parts = ['engines','lifeSupport','sensors'];
    const part = parts[rng.int(0,parts.length-1)];
    const wear = starterShip.applyCompartmentDamage(part, rng.int(1,3));
    eventSystem.emitLog(company, `Daily wear: ${part} degraded by ${wear}.`, day);
  }
  processSpeciesFriction(day);
  processTravelDay();
}

function bootstrap() {
  eventSystem.subscribe(() => render());
  const initialCrew = crewGenerator.generateBatch(2);
  if (initialCrew.every((c) => c.species === 'human')) initialCrew[0].species = 'avian', initialCrew[0].speciesModifiers = species.avian.modifiers;
  initialCrew.forEach((crewMember, idx) => {
    crewMember.archetype = idx === 0 ? `Executive Officer (${crewMember.archetype})` : `Chief Engineer (${crewMember.archetype})`;
    crewMember.morale = 70; crewMember.fatigue = 28;
    company.addCrewMember(crewMember);
  });
  starterShip.crewCount = company.crew.length;
  assignCaptain(company.crew.reduce((best, candidate) => (!best || candidate.attributes.command > best.attributes.command ? candidate : best), null));

  ensureLedger(gameLoop.day);
  generateRecruitmentPool(gameLoop.day);
  contractBoard.refreshContracts(gameLoop.day, starterShip.location);
  if (contractBoard.contracts.length >= 3) {
    contractBoard.contracts[0].risk = 20; contractBoard.contracts[0].payout = 2800;
    contractBoard.contracts[1].risk = 48; contractBoard.contracts[1].payout = 5200;
    contractBoard.contracts[2].risk = 78; contractBoard.contracts[2].payout = 9300;
  }

  ui.setTitle(`TallySpace Simulation — ${GAME_VERSION}`);
  eventSystem.emitLog(company, 'TallySpace v0.9.0 initialized: crew behavior, ship identity, and mission consequence loop active.', gameLoop.day);
  eventSystem.emitLog(company, `${company.name} founded with $${company.cash}.`, gameLoop.day);
  eventSystem.emitLog(company, `Commissioned ship ${starterShip.name}.`, gameLoop.day);

  ui.bindAdvanceHandlers(() => gameLoop.advanceDay(), () => gameLoop.advanceDays(10));
  ui.bindCrewActions({ onHire: hireCrew, onAssignCaptain: (index) => assignCaptain(company.crew[index]) });
  ui.bindShipActions({ onRestCrew: restCrew, onChangeShipMode: changeShipMode, onRefuelShip: refuelShip, onRepairShip: repairShip, onTravel: startTravel });
  ui.bindContractActions({ onSelectContract: selectContract, onAcceptContract: acceptContract });
  ui.bindExportActions({ onExportData: exportData, onCopyExportData: copyExportData });
  document.getElementById('new-game')?.addEventListener('click', setupNewGameFlow);
  document.getElementById('save-game')?.addEventListener('click', saveGame);
  document.getElementById('load-game')?.addEventListener('click', loadGame);
  document.getElementById('reset-save')?.addEventListener('click', resetSave);
  document.getElementById('dev-tools')?.addEventListener('click', openDevToolsPanel);

  setStatus('Simulation ready.');
  render();
}

bootstrap();
