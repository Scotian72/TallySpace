export default class Ship {
  constructor({ name, fuel = 100, integrity = 100, dailyFuelConsumption = 4 }) {
    this.name = name;
    this.fuel = fuel;
    this.integrity = integrity;
    this.dailyFuelConsumption = dailyFuelConsumption;
    this.captainRequired = true;
    this.captain = null;
  }

  assignCaptain(crewMember) {
    this.captain = crewMember;
  }

  consumeFuel() {
    this.fuel = Math.max(0, this.fuel - this.dailyFuelConsumption);
    return this.fuel;
  }
}
