export default class Ship {
  constructor({ id, name, chassis, maxFuel, fuelConsumption, maxIntegrity = 100, captainRequired = true }) {
    this.id = id;
    this.name = name;
    this.chassis = chassis;
    this.maxFuel = maxFuel;
    this.fuel = maxFuel;
    this.fuelConsumption = fuelConsumption;
    this.maxIntegrity = maxIntegrity;
    this.integrity = maxIntegrity;
    this.captainRequired = captainRequired;
    this.captainId = null;
  }

  assignCaptain(crewMemberId) {
    this.captainId = crewMemberId;
  }

  consumeFuel(multiplier = 1) {
    const amount = this.fuelConsumption * multiplier;
    this.fuel = Math.max(0, this.fuel - amount);
    return amount;
  }
}
