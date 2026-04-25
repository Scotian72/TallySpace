import RNG from './engine/RNG.js';
import GameLoop from './engine/GameLoop.js';
import Company from './engine/Company.js';
import Ship from './engine/Ship.js';
import CrewGenerator from './engine/CrewGenerator.js';
import EventSystem from './engine/EventSystem.js';
import { shipTemplates } from './data/ships.js';
import { crewArchetypes } from './data/crewArchetypes.js';
import { traits } from './data/traits.js';
import UIController from './ui/UIController.js';

const rng = new RNG(424242);
const eventSystem = new EventSystem();
const ui = new UIController();
const crewGenerator = new CrewGenerator({ rng, archetypes: crewArchetypes, traits });

const company = new Company({
  name: 'TallySpace Logistics',
  startingCash: 120000
});

const starterShipTemplate = shipTemplates[0];
const starterShip = new Ship(starterShipTemplate);
company.addShip(starterShip);
const REFUEL_UNIT_COST = 70;

const initialCrew = crewGenerator.generateBatch(3);
initialCrew.forEach((crewMember) => company.addCrewMember(crewMember));

const captain = company.crew.reduce((best, candidate) => {
  if (!best) {
    return candidate;
  }
  return candidate.attributes.command > best.attributes.command ? candidate : best;
}, null);
assignCaptain(captain, 1);

const gameLoop = new GameLoop({
  onDayAdvance(day) {
    runDailySimulation(day);
    ui.renderState({ day, company });
  }
});

function generateRecruitmentPool(day) {
  const count = 5;
  const existingNames = new Set(company.crew.map((crew) => crew.name));
  const candidates = crewGenerator.generateUniqueBatch(count, existingNames);
  company.availableCrew = candidates.slice(0, 5);
  eventSystem.emitLog(company, `Recruitment pool refreshed with ${company.availableCrew.length} candidates.`, day);
}

function assignCaptain(crewMember, day) {
  if (!crewMember) {
    return;
  }

  company.crew.forEach((member) => member.setCaptainStatus(false));
  crewMember.setCaptainStatus(true);
  starterShip.assignCaptain(crewMember);
  eventSystem.emitLog(company, `Assigned Captain ${crewMember.name} to ${starterShip.name}.`, day);
}

function hireCrew(index) {
  const candidate = company.availableCrew[index];
  if (!candidate) {
    return;
  }

  if (company.cash < candidate.wage) {
    eventSystem.emitLog(company, `Cannot hire ${candidate.name}; insufficient cash for $${candidate.wage}.`, gameLoop.day);
    ui.renderState({ day: gameLoop.day, company });
    return;
  }

  const hiredCrew = company.hireCandidate(index);
  eventSystem.emitLog(
    company,
    `Hired ${hiredCrew.name} for $${hiredCrew.wage}. Company cash is now $${company.cash}.`,
    gameLoop.day
  );
  ui.renderState({ day: gameLoop.day, company });
}

function restCrew() {
  if (!company.crew.length) {
    return;
  }

  const restCost = Math.round(company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0) * 0.65);
  if (company.cash < restCost) {
    eventSystem.emitLog(company, `Cannot rest crew; need $${restCost} but only have $${company.cash}.`, gameLoop.day);
    ui.renderState({ day: gameLoop.day, company });
    return;
  }

  company.cash -= restCost;
  company.crew.forEach((crewMember) => {
    const recovery = crewMember.rest(rng);
    eventSystem.emitLog(
      company,
      `${crewMember.name} rested: fatigue ${recovery.oldFatigue}→${recovery.newFatigue}, morale ${recovery.oldMorale}→${recovery.newMorale}.`,
      gameLoop.day
    );
  });
  eventSystem.emitLog(
    company,
    `Crew rest completed. Lost productivity cost: $${restCost}. Company cash is now $${company.cash}.`,
    gameLoop.day
  );
  ui.renderState({ day: gameLoop.day, company });
}

function changeShipMode(mode) {
  const ship = company.fleet[0];
  if (!ship) {
    return;
  }

  if (ship.setOperationMode(mode)) {
    eventSystem.emitLog(company, `${ship.name} operation mode set to ${mode}.`, gameLoop.day);
  }

  ui.renderState({ day: gameLoop.day, company });
}

function refuelShip() {
  const ship = company.fleet[0];
  if (!ship) {
    return;
  }

  const missingFuel = ship.fuelCapacity - ship.fuel;
  if (missingFuel <= 0) {
    eventSystem.emitLog(company, `${ship.name} fuel tanks are already full.`, gameLoop.day);
    ui.renderState({ day: gameLoop.day, company });
    return;
  }

  const affordableFuel = Math.floor(company.cash / REFUEL_UNIT_COST);
  const fuelToBuy = Math.min(missingFuel, affordableFuel);

  if (fuelToBuy <= 0) {
    eventSystem.emitLog(company, `Cannot refuel ${ship.name}; each fuel costs $${REFUEL_UNIT_COST} and cash is $${company.cash}.`, gameLoop.day);
    ui.renderState({ day: gameLoop.day, company });
    return;
  }

  const cost = fuelToBuy * REFUEL_UNIT_COST;
  const addedFuel = ship.refuel(fuelToBuy);
  company.cash -= cost;
  eventSystem.emitLog(
    company,
    `Refueled ${ship.name} by ${addedFuel} for $${cost}. Fuel is now ${ship.fuel}/${ship.fuelCapacity}.`,
    gameLoop.day
  );
  ui.renderState({ day: gameLoop.day, company });
}

function runDailySimulation(day) {
  if (day % 5 === 0) {
    generateRecruitmentPool(day);
  }

  const wagesToday = company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0);
  company.cash -= wagesToday;
  eventSystem.emitLog(company, `Paid crew wages: $${wagesToday}.`, day);

  const remainingCrew = [];
  const shipCanOperate = starterShip.fuel > 0 && Boolean(starterShip.captain);
  company.crew.forEach((crewMember) => {
    const oldFatigue = crewMember.fatigue;
    const oldMorale = crewMember.morale;
    const { fatigueMultiplier } = starterShip.getOperationModeModifiers();
    const fatigueRange = [2, 6];
    const moralePenaltyMultiplier = starterShip.fuel > 0 ? 1 : 1.8;
    crewMember.updateDaily(rng, {
      fatigueRange,
      fatigueMultiplier,
      isOperating: shipCanOperate,
      moralePenaltyMultiplier
    });

    if (starterShip.fuel <= 0) {
      crewMember.morale = Math.max(0, crewMember.morale - rng.int(2, 4));
    }

    if (crewMember.fatigue !== oldFatigue || crewMember.morale !== oldMorale) {
      eventSystem.emitLog(
        company,
        `${crewMember.name} fatigue ${oldFatigue}→${crewMember.fatigue}, morale ${oldMorale}→${crewMember.morale}.`,
        day
      );
    }

    if (crewMember.shouldQuit(rng)) {
      if (crewMember.isCaptain) {
        starterShip.assignCaptain(null);
      }
      eventSystem.emitLog(company, `${crewMember.name} quit due to low morale.`, day);
      return;
    }

    remainingCrew.push(crewMember);
  });

  company.crew = remainingCrew;

  if (!starterShip.captain && company.crew.length) {
    const fallbackCaptain = company.crew.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }
      return candidate.attributes.command > best.attributes.command ? candidate : best;
    }, null);
    assignCaptain(fallbackCaptain, day);
  }

  if (starterShip.fuel <= 0) {
    eventSystem.emitLog(company, `${starterShip.name} is out of fuel; operations are halted and morale is deteriorating faster.`, day);
  }

  company.fleet.forEach((ship) => {
    const hadCaptain = Boolean(ship.captain);
    const produced = hadCaptain && ship.fuel > 0;

    if (produced) {
      const revenue = ship.calculateDailyRevenue();
      company.cash += revenue;
      eventSystem.emitLog(company, `${ship.name} generated $${revenue} in deliveries. Company cash is now $${company.cash}.`, day);
    } else {
      eventSystem.emitLog(company, `${ship.name} produced nothing today.`, day);
    }

    const { fuel, usage } = ship.consumeFuel();
    if (usage > 0) {
      eventSystem.emitLog(
        company,
        `${ship.name} [${ship.operationMode}] consumed ${usage} fuel. Remaining fuel: ${fuel}.`,
        day
      );
    }

    if (ship.captainRequired && !hadCaptain) {
      eventSystem.emitLog(company, `${ship.name} has no captain assigned.`, day);
    }

    if (ship.fuel <= 0) {
      eventSystem.emitLog(company, `${ship.name} has run out of fuel.`, day);
    }
  });
}

function bootstrap() {
  eventSystem.subscribe(() => {
    ui.renderState({ day: gameLoop.day, company });
  });

  generateRecruitmentPool(gameLoop.day);

  eventSystem.emitLog(company, `${company.name} founded with $${company.cash}.`, gameLoop.day);
  eventSystem.emitLog(company, `Commissioned ship ${starterShip.name}.`, gameLoop.day);
  eventSystem.emitLog(company, `Crew roster initialized: ${company.crew.map((crew) => crew.name).join(', ')}.`, gameLoop.day);

  ui.bindAdvanceHandlers(
    () => gameLoop.advanceDay(),
    () => gameLoop.advanceDays(10)
  );

  ui.bindCrewActions({
    onHire: (index) => hireCrew(index),
    onAssignCaptain: (index) => assignCaptain(company.crew[index], gameLoop.day)
  });
  ui.bindShipActions({
    onRestCrew: () => restCrew(),
    onChangeShipMode: (mode) => changeShipMode(mode),
    onRefuelShip: () => refuelShip()
  });

  ui.renderState({ day: gameLoop.day, company });
}

bootstrap();
