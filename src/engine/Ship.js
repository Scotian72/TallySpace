export default class Ship {
  constructor({
    name,
    fuel = 100,
    integrity = 100,
    dailyFuelConsumption = 4,
    fuelCapacity = fuel,
    baseDailyRevenue = 3000,
    location = 'new-canaan'
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
    this.location = location;
    this.activeContract = null;
    this.travelPlan = null;
    this.compartments = { engines: 88, lifeSupport: 92, sensors: 90, hull: this.integrity };
    this.quirks = [];
    this.historyLog = [];
    this.totalMissionsCompleted = 0;
    this.totalDamageTaken = 0;
    this.repairsPerformed = 0;
    this.crewDeaths = 0;
  }

  assignCaptain(crewMember) { this.captain = crewMember; }

  setOperationMode(mode) {
    const allowedModes = ['LOW', 'NORMAL', 'HIGH'];
    if (!allowedModes.includes(mode)) return false;
    this.operationMode = mode;
    return true;
  }

  getOperationModeModifiers() {
    const modeModifiers = {
      LOW: { fuelMultiplier: 0.7, fatigueMultiplier: 0.7, productivityMultiplier: 0.8, speedMultiplier: 0.9, riskMultiplier: 0.8, payoutMultiplier: 0.95 },
      NORMAL: { fuelMultiplier: 1, fatigueMultiplier: 1, productivityMultiplier: 1, speedMultiplier: 1, riskMultiplier: 1, payoutMultiplier: 1 },
      HIGH: { fuelMultiplier: 1.5, fatigueMultiplier: 1.8, productivityMultiplier: 1.25, speedMultiplier: 1.2, riskMultiplier: 1.25, payoutMultiplier: 1.15 }
    };
    return modeModifiers[this.operationMode] ?? modeModifiers.NORMAL;
  }

  getReadiness() {
    if (!this.captain) return 'NO CAPTAIN';
    if ((this.crewCount ?? 0) < (this.minCrew ?? 1)) return 'LOW CREW';
    if (this.fuel <= 0) return 'NO FUEL';
    if (this.integrity < 35) return 'DAMAGED';
    if (!this.activeContract) return 'NO CONTRACT';
    return 'READY';
  }

  consumeFuel() {
    if (this.fuel <= 0) return { fuel: 0, usage: 0, multiplier: 0 };
    const command = this.captain?.attributes?.command ?? 50;
    const nav = this.captain?.attributes?.navigation ?? 50;
    const baseMultiplier = this.getFuelMultiplierFromCommand(command);
    const navBonus = Math.max(0.75, 1 - (nav - 50) / 250);
    const effectiveness = this.captain?.getEffectivenessMultiplier?.() ?? 1;
    const { fuelMultiplier } = this.getOperationModeModifiers();
    const multiplier = baseMultiplier * navBonus * fuelMultiplier * (1 + (1 - effectiveness) * 0.5);
    const usage = Math.max(1, Math.round(this.dailyFuelConsumption * multiplier));
    this.fuel = Math.max(0, this.fuel - usage);
    return { fuel: this.fuel, usage, multiplier };
  }

  calculateDailyRevenue() {
    if (!this.captain || this.fuel <= 0) return 0;
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

  repair(points) {
    const next = Math.min(100, this.integrity + Math.max(0, Math.round(points)));
    const restored = next - this.integrity;
    this.integrity = next;
    return restored;
  }

  applyDamage(points) {
    const loss = Math.max(0, Math.round(points));
    this.integrity = Math.max(0, this.integrity - loss);
    this.totalDamageTaken += loss;
    this.compartments.hull = this.integrity;
    return loss;
  }

  applyCompartmentDamage(compartment, points) {
    if (!(compartment in this.compartments)) return 0;
    const loss = Math.max(0, Math.round(points));
    this.compartments[compartment] = Math.max(0, this.compartments[compartment] - loss);
    if (compartment === 'hull') this.integrity = this.compartments.hull;
    this.totalDamageTaken += loss;
    return loss;
  }

  repairCompartments(points) {
    let remaining = Math.max(0, Math.round(points));
    let repaired = 0;
    Object.keys(this.compartments).forEach((key) => {
      if (remaining <= 0) return;
      const need = 100 - this.compartments[key];
      const used = Math.min(remaining, need);
      this.compartments[key] += used;
      repaired += used;
      remaining -= used;
    });
    this.integrity = typeof this.compartments.hull === 'number' ? this.compartments.hull : this.integrity;
    this.repairsPerformed += repaired > 0 ? 1 : 0;
    return repaired;
  }

  getFuelMultiplierFromCommand(command) {
    if (command >= 80) return 0.7;
    if (command >= 65) return 0.85;
    if (command <= 35) return 1.35;
    if (command <= 50) return 1.15;
    return 1;
  }
}
