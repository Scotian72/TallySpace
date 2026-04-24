export default class CrewMember {
  constructor({ id, name, role, traits = [], morale = 70, fatigue = 20, loyalty = 50, wage = 100 }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.traits = traits;
    this.morale = morale;
    this.fatigue = fatigue;
    this.loyalty = loyalty;
    this.wage = wage;
  }

  tickDaily(rng) {
    const fatigueGain = rng.nextInt(2, 7);
    this.fatigue = Math.min(100, this.fatigue + fatigueGain);

    let moraleShift = -1;
    if (this.fatigue > 80) moraleShift -= 2;
    if (this.loyalty > 70) moraleShift += 1;

    this.morale = Math.max(0, Math.min(100, this.morale + moraleShift));
  }
}
