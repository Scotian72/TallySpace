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

  company.crew.forEach((crewMember) => {
    const recovery = crewMember.rest(rng);
    eventSystem.emitLog(
      company,
      `${crewMember.name} rested: fatigue ${recovery.oldFatigue}→${recovery.newFatigue}, morale ${recovery.oldMorale}→${recovery.newMorale}.`,
      gameLoop.day
    );
  });
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

function runDailySimulation(day) {
  if (day % 5 === 0) {
    generateRecruitmentPool(day);
  }

  const wagesToday = company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0);
  company.cash -= wagesToday;
  eventSystem.emitLog(company, `Paid crew wages: $${wagesToday}.`, day);

  const remainingCrew = [];
  company.crew.forEach((crewMember) => {
    const oldFatigue = crewMember.fatigue;
    const oldMorale = crewMember.morale;
    const fatigueRange = starterShip.getOperationModeModifiers().fatigueRange;
    crewMember.updateDaily(rng, { fatigueRange });

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

  company.fleet.forEach((ship) => {
    const hadCaptain = Boolean(ship.captain);
    const { fuel, usage } = ship.consumeFuel();
    eventSystem.emitLog(
      company,
      `${ship.name} [${ship.operationMode}] consumed ${usage} fuel. Remaining fuel: ${fuel}.`,
      day
    );

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
    onChangeShipMode: (mode) => changeShipMode(mode)
  });

  ui.renderState({ day: gameLoop.day, company });
}

bootstrap();
