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

  updateDaily(
    rng,
    {
      fatigueRange = [2, 6],
      fatigueMultiplier = 1,
      isOperating = true,
      moralePenaltyMultiplier = 1
    } = {}
  ) {
    const [fatigueMin, fatigueMax] = fatigueRange;
    const fatigueGain = Math.round(rng.int(fatigueMin, fatigueMax) * fatigueMultiplier);
    const baselineRecovery = rng.int(2, 5);
    const exhaustionRecovery = this.fatigue >= 85 ? rng.int(2, 4) : 0;
    const shutdownRecovery = isOperating ? 0 : rng.int(3, 6);
    const fatigueDelta = fatigueGain - baselineRecovery - exhaustionRecovery - shutdownRecovery;

    this.fatigue = Math.max(0, Math.min(100, this.fatigue + fatigueDelta));
    this.morale = Math.max(0, Math.min(100, this.morale + rng.int(-1, 2)));

    if (this.fatigue > 70) {
      const fatigueMoralePenalty = Math.ceil(rng.int(1, 3) * moralePenaltyMultiplier);
      this.morale = Math.max(0, this.morale - fatigueMoralePenalty);
    } else if (this.fatigue <= 35) {
      this.morale = Math.min(100, this.morale + rng.int(1, 3));
    }
  }

  rest(rng) {
    const fatigueRecovery = rng.int(30, 50);
    const moraleRecovery = rng.int(10, 20);
    const oldFatigue = this.fatigue;
    const oldMorale = this.morale;

    this.fatigue = Math.max(0, this.fatigue - fatigueRecovery);
    this.morale = Math.min(100, this.morale + moraleRecovery);

    return {
      oldFatigue,
      oldMorale,
      newFatigue: this.fatigue,
      newMorale: this.morale,
      fatigueRecovery,
      moraleRecovery
    };
  }

  shouldQuit(rng) {
    if (this.morale >= 10) {
      return false;
    }

    const loyaltyShield = Math.max(0, this.loyalty - 40) * 0.005;
    const quitChance = Math.max(0.1, 0.45 - loyaltyShield);
    return rng.next() < quitChance;
  }

  getEffectivenessMultiplier() {
    if (this.fatigue >= 100) {
      return 0.6;
    }

    if (this.fatigue >= 85) {
      return 0.8;
    }

    return 1;
  }
}
