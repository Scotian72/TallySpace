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
    this.fatigue = Math.min(100, this.fatigue + rng.int(1, 4));
    this.morale = Math.max(0, Math.min(100, this.morale + rng.int(-2, 1)));

    if (this.fatigue > 80) {
      this.morale = Math.max(0, this.morale - 1);
    }
  }
}
