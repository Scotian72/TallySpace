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
    const previousFatigue = this.fatigue;
    const previousMorale = this.morale;

    this.fatigue = Math.min(100, this.fatigue + 1);
    this.morale = Math.max(0, Math.min(100, this.morale + rng.int(-1, 1)));

    return {
      previousFatigue,
      previousMorale,
      fatigue: this.fatigue,
      morale: this.morale
    };
  }
}
