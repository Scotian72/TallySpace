export const systems = [
  {
    id: 'new-canaan',
    name: 'New Canaan Station',
    security: 90,
    fuelPrice: 62,
    repairCostModifier: 0.85,
    contractBias: 'Freight',
    description: 'Safe hub with reliable docks, steady recruitment, and low-risk contracts.',
    connectedSystems: ['kejik-gate', 'arclight-yard', 'vesta-ring']
  },
  {
    id: 'kejik-gate',
    name: 'Kejik Gate Terminal',
    security: 75,
    fuelPrice: 85,
    repairCostModifier: 1.15,
    contractBias: 'Passenger',
    description: 'Major jump gate with heavy traffic, strict controls, and expensive tariffs.',
    connectedSystems: ['new-canaan', 'hollow-drift', 'blackline-expanse']
  },
  {
    id: 'arclight-yard',
    name: 'Arclight Yard',
    security: 65,
    fuelPrice: 70,
    repairCostModifier: 0.75,
    contractBias: 'Salvage Lead',
    description: 'Industrial yard known for used parts, rough crews, and salvage opportunities.',
    connectedSystems: ['new-canaan', 'hollow-drift']
  },
  {
    id: 'hollow-drift',
    name: 'Hollow Drift',
    security: 35,
    fuelPrice: 78,
    repairCostModifier: 1.3,
    contractBias: 'Escort',
    description: 'Dangerous frontier lane where escorts and salvage can pay if you survive.',
    connectedSystems: ['arclight-yard', 'kejik-gate', 'vesta-ring', 'blackline-expanse']
  },
  {
    id: 'vesta-ring',
    name: 'Vesta Agricultural Ring',
    security: 45,
    fuelPrice: 66,
    repairCostModifier: 1,
    contractBias: 'Freight',
    description: 'High food and passenger flow under growing piracy pressure.',
    connectedSystems: ['new-canaan', 'hollow-drift']
  },
  {
    id: 'blackline-expanse',
    name: 'Blackline Expanse',
    security: 20,
    fuelPrice: 92,
    repairCostModifier: 1.45,
    contractBias: 'Survey',
    description: 'Unstable deep-space region with high risk, high reward exploration leads.',
    connectedSystems: ['kejik-gate', 'hollow-drift']
  }
];

export const systemById = Object.fromEntries(systems.map((system) => [system.id, system]));
