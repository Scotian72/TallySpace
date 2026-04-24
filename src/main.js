import RNG from './engine/RNG.js';
import GameLoop from './engine/GameLoop.js';
import Company from './engine/Company.js';
import Ship from './engine/Ship.js';
import CrewMember from './engine/CrewMember.js';
import EventSystem from './engine/EventSystem.js';
import { shipTemplates } from './data/ships.js';
import { crewArchetypes } from './data/crewArchetypes.js';
import { traits } from './data/traits.js';
import UIController from './ui/UIController.js';

const rng = new RNG(424242);
const eventSystem = new EventSystem();
const ui = new UIController();

const company = new Company({
  name: 'TallySpace Logistics',
  startingCash: 120000
});

const starterShipTemplate = shipTemplates[0];
const starterShip = new Ship(starterShipTemplate);
company.addShip(starterShip);

const createdCrew = crewArchetypes.map((archetype) => {
  const name = rng.pick(archetype.names);

  const attributes = Object.fromEntries(
    Object.entries(archetype.baseAttributes).map(([key, base]) => [
      key,
      Math.max(1, Math.min(100, base + rng.int(-6, 6)))
    ])
  );

  const crewMember = new CrewMember({
    name,
    attributes,
    wage: archetype.wage,
    traits: [rng.pick(traits)]
  });

  company.addCrewMember(crewMember);
  return crewMember;
});

const captain = createdCrew[0];
captain.setCaptainStatus(true);
starterShip.assignCaptain(captain);

const gameLoop = new GameLoop({
  onDayAdvance(day) {
    runDailySimulation(day);
    ui.renderState({ day, company });
  }
});

function runDailySimulation(day) {
  const wagesToday = company.crew.reduce((sum, crewMember) => sum + crewMember.wage, 0);
  company.cash -= wagesToday;
  eventSystem.emitLog(company, `Paid crew wages: $${wagesToday}.`, day);

  company.crew.forEach((crewMember) => {
    const oldFatigue = crewMember.fatigue;
    const oldMorale = crewMember.morale;
    crewMember.updateDaily(rng);

    if (crewMember.fatigue !== oldFatigue || crewMember.morale !== oldMorale) {
      eventSystem.emitLog(
        company,
        `${crewMember.name} fatigue ${oldFatigue}→${crewMember.fatigue}, morale ${oldMorale}→${crewMember.morale}.`,
        day
      );
    }
  });

  company.fleet.forEach((ship) => {
    const hadCaptain = Boolean(ship.captain);
    ship.consumeFuel();
    eventSystem.emitLog(company, `${ship.name} consumed fuel. Remaining fuel: ${ship.fuel}.`, day);

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

  eventSystem.emitLog(company, `${company.name} founded with $${company.cash}.`, gameLoop.day);
  eventSystem.emitLog(company, `Commissioned ship ${starterShip.name}.`, gameLoop.day);
  eventSystem.emitLog(company, `Assigned Captain ${captain.name} to ${starterShip.name}.`, gameLoop.day);
  eventSystem.emitLog(company, `Crew roster initialized: ${company.crew.map((crew) => crew.name).join(', ')}.`, gameLoop.day);

  ui.bindAdvanceHandlers(
    () => gameLoop.advanceDay(),
    () => gameLoop.advanceDays(10)
  );

  ui.renderState({ day: gameLoop.day, company });
}

bootstrap();
