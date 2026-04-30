export const species = {
  human: {
    key: 'human',
    name: 'Human',
    code: 'H',
    modifiers: {}
  },
  mammalian: {
    key: 'mammalian',
    name: 'Mammalian',
    code: 'M',
    modifiers: { moraleRecovery: 0.2, conflictChance: 0.1, fatigueRecovery: 0.15 }
  },
  reptilian: {
    key: 'reptilian',
    name: 'Reptilian',
    code: 'R',
    modifiers: { moraleStability: 0.25, performanceConsistency: 0.2, conflictChance: 0.05 }
  },
  amphibian: {
    key: 'amphibian',
    name: 'Amphibian',
    code: 'A',
    modifiers: { adaptability: 0.25, environmentSensitivity: 0.2, flexibleRoles: 0.2 }
  },
  avian: {
    key: 'avian',
    name: 'Avian',
    code: 'V',
    modifiers: { navigationBonus: 0.2, fatigueRate: 0.2, fatigueMoraleImpact: 0.2 }
  },
  rock: {
    key: 'rock',
    name: 'Rock-Based',
    code: 'K',
    modifiers: { durability: 0.35, fatigueRate: -0.25, damageControl: 0.25, fatigueMoraleImpact: -0.2 }
  }
};

export const speciesKeys = Object.keys(species);
export const speciesLegend = speciesKeys.map((key) => `${species[key].code} = ${species[key].name}`);
