export default class Ship {
  constructor({
    name,
    fuel = 100,
    integrity = 100,
    dailyFuelConsumption = 4,
    fuelCapacity = fuel,
    baseDailyRevenue = 3000
  }) {
    this.name = name;
    this.fuel = fuel;
    this.fuelCapacity = fuelCapacity;
    this.integrity = integrity;
    this.dailyFuelConsumption = dailyFuelConsumption;
    this.baseDailyRevenue = baseDailyRevenue;
    this.captainRequired = true;
    this.captain = null;
    this.operationMode = 'NORMAL';
  }

  assignCaptain(crewMember) {
    this.captain = crewMember;
  }

  setOperationMode(mode) {
    const allowedModes = ['LOW', 'NORMAL', 'HIGH'];
    if (!allowedModes.includes(mode)) {
      return false;
    }

    this.operationMode = mode;
    return true;
  }

  getOperationModeModifiers() {
    const modeModifiers = {
      LOW: { fuelMultiplier: 0.5, fatigueMultiplier: 0.5, productivityMultiplier: 0.75 },
      NORMAL: { fuelMultiplier: 1, fatigueMultiplier: 1, productivityMultiplier: 1 },
      HIGH: { fuelMultiplier: 1.5, fatigueMultiplier: 2, productivityMultiplier: 1.3 }
    };
    return modeModifiers[this.operationMode] ?? modeModifiers.NORMAL;
  }

  consumeFuel() {
    if (this.fuel <= 0) {
      return { fuel: 0, usage: 0, multiplier: 0 };
    }

    const command = this.captain?.attributes?.command ?? 50;
    const baseMultiplier = this.getFuelMultiplierFromCommand(command);
    const effectiveness = this.captain?.getEffectivenessMultiplier?.() ?? 1;
    const { fuelMultiplier } = this.getOperationModeModifiers();
    const multiplier = baseMultiplier * fuelMultiplier * (1 + (1 - effectiveness) * 0.5);
    const usage = Math.max(1, Math.round(this.dailyFuelConsumption * multiplier));
    this.fuel = Math.max(0, this.fuel - usage);
    return { fuel: this.fuel, usage, multiplier };
  }

  calculateDailyRevenue() {
    if (!this.captain || this.fuel <= 0) {
      return 0;
    }

    const effectiveness = this.captain.getEffectivenessMultiplier?.() ?? 1;
    const commandSkill = this.captain?.attributes?.command ?? 50;
    const commandBonus = 1 + (commandSkill - 50) / 200;
    const { productivityMultiplier } = this.getOperationModeModifiers();
    const multiplier = Math.max(0.3, effectiveness * commandBonus * productivityMultiplier);
    return Math.max(0, Math.round(this.baseDailyRevenue * multiplier));
  }

  refuel(amount) {
    const refillAmount = Math.max(0, Math.round(amount));
    const nextFuel = Math.min(this.fuelCapacity, this.fuel + refillAmount);
    const addedFuel = nextFuel - this.fuel;
    this.fuel = nextFuel;
    return addedFuel;
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
