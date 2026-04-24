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
    const command = this.captain?.attributes?.command ?? 50;
    const multiplier = this.getFuelMultiplierFromCommand(command);
    const usage = Math.max(1, Math.round(this.dailyFuelConsumption * multiplier));
    this.fuel = Math.max(0, this.fuel - usage);
    return { fuel: this.fuel, usage, multiplier };
  }

  getFuelMultiplierFromCommand(command) {
    if (command >= 80) {
      return 0.7;
    }

    if (command >= 65) {
      return 0.85;
    }

    if (command <= 35) {
      return 1.35;
    }

    if (command <= 50) {
      return 1.15;
    }

    return 1;
  }
}
