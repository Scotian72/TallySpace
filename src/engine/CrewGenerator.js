import CrewMember from './CrewMember.js';

export default class CrewGenerator {
  constructor({ rng, archetypes, traits }) {
    this.rng = rng;
    this.archetypes = archetypes;
    this.traits = traits;
  }

  generateCandidate() {
    const archetype = this.rng.pick(this.archetypes);
    const name = this.rng.pick(archetype.names);

    const attributes = Object.fromEntries(
      Object.entries(archetype.baseAttributes).map(([key, base]) => [
        key,
        Math.max(1, Math.min(100, base + this.rng.int(-10, 10)))
      ])
    );

    const wageVariance = this.rng.int(-20, 30);
    const wage = Math.max(90, archetype.wage + wageVariance);

    return new CrewMember({
      name,
      attributes,
      morale: this.rng.int(55, 85),
      fatigue: this.rng.int(5, 25),
      loyalty: this.rng.int(45, 85),
      wage,
      traits: [this.rng.pick(this.traits)]
    });
  }

  generateBatch(count) {
    return Array.from({ length: count }, () => this.generateCandidate());
  }
}
