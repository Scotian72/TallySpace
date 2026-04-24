import RNG from './engine/RNG.js';
import GameLoop from './engine/GameLoop.js';
import Company from './engine/Company.js';
import Ship from './engine/Ship.js';
import CrewMember from './engine/CrewMember.js';
import EventSystem from './engine/EventSystem.js';
import { shipTemplates } from './data/ships.js';
import { crewArchetypes } from './data/crewArchetypes.js';
import { traits } from './data/traits.js';
import UI from './ui/UI.js';

const rng = new RNG(424242);
const eventSystem = new EventSystem();
const ui = new UI();

const company = new Company({
  name: 'TallySpace Logistics',
  startingCash: 120000
});

const starterShip = new Ship(shipTemplates[0]);
company.addShip(starterShip);

const starterArchetypes = crewArchetypes.slice(0, 3);
const createdCrew = starterArchetypes.map((archetype) => {
  const attributes = Object.fromEntries(
    Object.entries(archetype.baseAttributes).map(([attribute, baseValue]) => [
      attribute,
      Math.max(1, Math.min(100, baseValue + rng.int(-5, 5)))
    ])
  );

  const member = new CrewMember({
    name: rng.pick(archetype.names),
    attributes,
    wage: archetype.wage,
    traits: [rng.pick(traits)]
  });

  company.addCrewMember(member);
  return member;
});

const captain = createdCrew[0];
captain.setCaptainStatus(true);
starterShip.assignCaptain(captain);

function runDailySimulation(day) {
  company.crew.forEach((crewMember) => {
    const dailyCrewState = crewMember.updateDaily(rng);
    eventSystem.log(company, {
      day,
      type: 'crew.daily',
      message: `${crewMember.name}: fatigue ${dailyCrewState.previousFatigue}→${dailyCrewState.fatigue}, morale ${dailyCrewState.previousMorale}→${dailyCrewState.morale}.`,
      metadata: { name: crewMember.name, ...dailyCrewState }
    });
  });

  company.fleet.forEach((ship) => {
    const dailyShipState = ship.updateDaily();

    eventSystem.log(company, {
      day,
      type: 'ship.fuel',
      message: `${ship.name} consumed ${ship.dailyFuelConsumption} fuel. Remaining fuel: ${dailyShipState.fuel}.`,
      metadata: { shipName: ship.name, fuel: dailyShipState.fuel }
    });

    if (!dailyShipState.hasCaptain) {
      eventSystem.log(company, {
        day,
        type: 'ship.warning',
        message: `${ship.name} cannot operate without a captain.`,
        metadata: { shipName: ship.name }
      });
    }
  });
}

const gameLoop = new GameLoop({
  onDayAdvance(day) {
    runDailySimulation(day);
  }
});

function bootstrap() {
  eventSystem.subscribe(() => {
    ui.render({ day: gameLoop.day, company });
  });

  eventSystem.log(company, {
    day: gameLoop.day,
    type: 'company.init',
    message: `${company.name} founded with $${company.cash}.`
  });

  eventSystem.log(company, {
    day: gameLoop.day,
    type: 'ship.init',
    message: `Commissioned ${starterShip.name}.`
  });

  eventSystem.log(company, {
    day: gameLoop.day,
    type: 'crew.init',
    message: `Assigned Captain ${captain.name} to ${starterShip.name}.`
  });

  ui.bindAdvanceHandlers(
    () => gameLoop.tick(),
    () => gameLoop.advanceDays(10)
  );

  ui.render({ day: gameLoop.day, company });
}

bootstrap();
