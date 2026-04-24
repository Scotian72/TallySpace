export default class GameLoop {
  constructor({ company, rng }) {
    this.company = company;
    this.rng = rng;
    this.day = 1;
  }

  tick(days = 1) {
    for (let i = 0; i < days; i += 1) {
      this.runSingleDay();
    }
  }

  runSingleDay() {
    this.company.log(this.day, `Day ${this.day} begins.`);

    this.company.crew.forEach((member) => {
      member.tickDaily(this.rng);
      if (member.fatigue > 85) {
        this.company.log(this.day, `${member.name} is severely fatigued.`, 'warning');
      }
      if (member.morale < 30) {
        this.company.log(this.day, `${member.name} morale is dangerously low.`, 'warning');
      }
    });

    this.company.fleet.forEach((ship) => {
      if (ship.captainRequired && !ship.captainId) {
        this.company.log(this.day, `${ship.name} lacks a captain.`, 'warning');
      }
      const consumed = ship.consumeFuel();
      this.company.log(this.day, `${ship.name} consumed ${consumed.toFixed(1)} fuel.`);
      if (ship.fuel <= ship.maxFuel * 0.2) {
        this.company.log(this.day, `${ship.name} fuel is low (${ship.fuel.toFixed(1)}).`, 'warning');
      }
    });

    this.company.payDailyWages(this.day);
    this.day += 1;
  }
}
