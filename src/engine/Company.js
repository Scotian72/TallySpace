export default class Company {
  constructor({ name, cash = 10000, debt = 0, eventSystem }) {
    this.name = name;
    this.cash = cash;
    this.debt = debt;
    this.fleet = [];
    this.crew = [];
    this.eventSystem = eventSystem;
  }

  addShip(ship, day) {
    this.fleet.push(ship);
    this.log(day, `Ship acquired: ${ship.name}.`);
  }

  addCrewMember(member, day) {
    this.crew.push(member);
    this.log(day, `Crew hired: ${member.name} (${member.role}).`);
  }

  assignCaptain(shipId, crewId, day) {
    const ship = this.fleet.find((s) => s.id === shipId);
    const crew = this.crew.find((c) => c.id === crewId);
    if (!ship || !crew) return false;

    ship.assignCaptain(crewId);
    this.log(day, `${crew.name} assigned as captain of ${ship.name}.`);
    return true;
  }

  payDailyWages(day) {
    const wages = this.crew.reduce((sum, member) => sum + member.wage, 0);
    this.cash -= wages;
    this.log(day, `Paid crew wages: $${wages}.`);
  }

  log(day, message, type = 'info') {
    return this.eventSystem.log(day, message, type);
  }
}
