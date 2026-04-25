export default class Ship {
  constructor({ name, fuel = 100, integrity = 100, dailyFuelConsumption = 4 }) {
    this.name = name;
    this.fuel = fuel;
    this.integrity = integrity;
    this.dailyFuelConsumption = dailyFuelConsumption;
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
      LOW: { fuelMultiplier: 0.75, fatigueRange: [1, 3] },
      NORMAL: { fuelMultiplier: 1, fatigueRange: [2, 6] },
      HIGH: { fuelMultiplier: 1.35, fatigueRange: [5, 10] }
    };
    return modeModifiers[this.operationMode] ?? modeModifiers.NORMAL;
  }

  consumeFuel() {
    const command = this.captain?.attributes?.command ?? 50;
    const baseMultiplier = this.getFuelMultiplierFromCommand(command);
    const effectiveness = this.captain?.getEffectivenessMultiplier?.() ?? 1;
    const { fuelMultiplier } = this.getOperationModeModifiers();
    const multiplier = baseMultiplier * fuelMultiplier * (1 + (1 - effectiveness) * 0.5);
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
