export default class CrewMember {
  constructor({
    name,
    attributes,
    morale = 70,
    fatigue = 10,
    loyalty = 60,
    wage = 120,
    traits = []
  }) {
    this.name = name;
    this.attributes = attributes;
    this.morale = morale;
    this.fatigue = fatigue;
    this.loyalty = loyalty;
    this.wage = wage;
    this.traits = traits;
    this.isCaptain = false;
  }

  setCaptainStatus(isCaptain) {
    this.isCaptain = isCaptain;
  }

  updateDaily(rng) {
    this.fatigue = Math.min(100, this.fatigue + rng.int(2, 6));
    this.morale = Math.max(0, Math.min(100, this.morale + rng.int(-2, 1)));

    if (this.fatigue > 70) {
      this.morale = Math.max(0, this.morale - rng.int(1, 3));
    }
  }

  shouldQuit(rng) {
    if (this.morale > 25) {
      return false;
    }

    const loyaltyShield = Math.max(0, this.loyalty - 40) * 0.005;
    const quitChance = Math.max(0.05, 0.3 - loyaltyShield);
    return rng.next() < quitChance;
  }
}
