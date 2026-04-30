import { species } from '../data/species.js';
import CrewMember from './CrewMember.js';


const speciesRollTable = [
  { key: 'human', weight: 68 },
  { key: 'mammalian', weight: 10 },
  { key: 'reptilian', weight: 8 },
  { key: 'amphibian', weight: 6 },
  { key: 'avian', weight: 5 },
  { key: 'rock', weight: 3 }
];

const histories = [
  'Ran courier routes through disputed lanes and knows every shortcut beacon.',
  'Worked station-side logistics before signing onto independent ships.',
  'Survived a failed salvage venture and is hungry for a comeback.',
  'Left a corporate posting after whistleblowing on procurement fraud.',
  'Grew up in transfer docks and treats every ship like home.'
];

export default class CrewGenerator {
  constructor({ rng, archetypes, traits }) {
    this.rng = rng;
    this.archetypes = archetypes;
    this.traits = traits;
  }

  pickSpecies() {
    const total = speciesRollTable.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.rng.int(1, total);
    for (const item of speciesRollTable) {
      roll -= item.weight;
      if (roll <= 0) return item.key;
    }
    return 'human';
  }

  generateCandidate() {
    const archetype = this.rng.pick(this.archetypes);
    const name = this.rng.pick(archetype.names);
    const attributes = Object.fromEntries(
      Object.entries(archetype.baseAttributes).map(([key, base]) => [key, Math.max(1, Math.min(100, base + this.rng.int(-10, 10)))])
    );

    const traitCount = this.rng.int(2, 3);
    const picked = new Set();
    while (picked.size < traitCount) picked.add(this.rng.pick(this.traits));
    const traits = [...picked];

    const rolePreference = attributes.navigation >= attributes.engineering && attributes.navigation >= attributes.command
      ? 'navigation'
      : attributes.engineering >= attributes.command
        ? 'engineering'
        : 'command';

    const wageVariance = this.rng.int(-20, 30);
    const wage = Math.max(90, archetype.wage + wageVariance);

    const speciesKey = this.pickSpecies();
    return new CrewMember({
      name,
      attributes,
      morale: this.rng.int(55, 85),
      fatigue: this.rng.int(5, 25),
      loyalty: this.rng.int(45, 85),
      wage,
      traits,
      archetype: archetype.name,
      personalHistory: this.rng.pick(histories),
      rolePreference,
      riskTolerance: this.rng.int(20, 90),
      discipline: this.rng.int(30, 90),
      greed: this.rng.int(15, 90),
      hiddenPotential: this.rng.int(20, 95),
      species: speciesKey,
      speciesModifiers: species[speciesKey]?.modifiers ?? {}
    });
  }

  generateBatch(count) {
    return Array.from({ length: count }, () => this.generateCandidate());
  }

  generateUniqueBatch(count, existingNames = new Set()) {
    const uniqueNames = new Set(existingNames);
    const candidates = [];
    let attempts = 0;
    while (candidates.length < count && attempts < count * 20) {
      attempts += 1;
      const candidate = this.generateCandidate();
      if (uniqueNames.has(candidate.name)) continue;
      uniqueNames.add(candidate.name);
      candidates.push(candidate);
    }
    return candidates;
  }
}
