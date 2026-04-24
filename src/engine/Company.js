export default class Company {
  constructor({ name, startingCash = 100000 }) {
    this.name = name;
    this.cash = startingCash;
    this.fleet = [];
    this.crew = [];
    this.eventLog = [];
  }

  addShip(ship) {
    this.fleet.push(ship);
  }

  addCrewMember(crewMember) {
    this.crew.push(crewMember);
  }
}
