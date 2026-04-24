import RNG from '../engine/RNG.js';
import GameLoop from '../engine/GameLoop.js';
import Company from '../engine/Company.js';
import Ship from '../engine/Ship.js';
import CrewMember from '../engine/CrewMember.js';
import EventSystem from '../engine/EventSystem.js';
import shipsData from '../data/ships.js';
import crewArchetypes from '../data/crewArchetypes.js';
import traits from '../data/traits.js';

export default class App {
  constructor(root) {
    this.root = root;
    this.rng = new RNG(424242);
    this.eventSystem = new EventSystem(300);
    this.company = new Company({
      name: 'TallySpace Logistics',
      cash: 15000,
      debt: 2500,
      eventSystem: this.eventSystem,
    });

    this.gameLoop = new GameLoop({ company: this.company, rng: this.rng });
  }

  init() {
    this.setupInitialSimulation();
    this.bindUI();
    this.render();
  }

  setupInitialSimulation() {
    const starterShipData = shipsData[0];
    const starterShip = new Ship(starterShipData);
    this.company.addShip(starterShip, this.gameLoop.day);

    const names = ['Mara Ives', 'Jin Calder', 'Rook Tal'];
    const selectedRoles = [crewArchetypes[0], crewArchetypes[1], crewArchetypes[2]];

    selectedRoles.forEach((archetype, index) => {
      const member = new CrewMember({
        id: `crew-${index + 1}`,
        name: names[index],
        role: archetype.role,
        morale: archetype.baseMorale,
        fatigue: archetype.baseFatigue,
        loyalty: archetype.baseLoyalty,
        wage: archetype.baseWage,
        traits: [this.rng.pick(traits), this.rng.pick(traits)],
      });

      this.company.addCrewMember(member, this.gameLoop.day);
    });

    const captain = this.company.crew.find((member) => member.role === 'Captain') || this.company.crew[0];
    this.company.assignCaptain(starterShip.id, captain.id, this.gameLoop.day);
    this.company.log(this.gameLoop.day, 'Simulation initialized.');
  }

  bindUI() {
    document.getElementById('advance-day').addEventListener('click', () => {
      this.gameLoop.tick(1);
      this.render();
    });

    document.getElementById('advance-10-days').addEventListener('click', () => {
      this.gameLoop.tick(10);
      this.render();
    });
  }

  render() {
    this.root.querySelector('[data-current-day]').textContent = String(this.gameLoop.day);
    this.root.querySelector('[data-cash]').textContent = `$${this.company.cash.toFixed(2)}`;
    this.root.querySelector('[data-ships]').textContent = String(this.company.fleet.length);
    this.root.querySelector('[data-crew]').textContent = String(this.company.crew.length);

    const events = this.eventSystem.getAll().slice().reverse().slice(0, 40);
    const log = this.root.querySelector('[data-event-log]');
    log.innerHTML = events
      .map((event) => `<li class="event-item event-${event.type}">Day ${event.day}: ${event.message}</li>`)
      .join('');
  }
}
