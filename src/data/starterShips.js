export const ORIGIN_LORE = {
  starterScenario:
    'You and your two companions follow an old salvage lead into a decaying orbital graveyard. The wrecks are Pre-Century Arlen Federation hulls, remnants of the Last Holdings War that ended 72 years ago. Their orbit is failing. You have time to restore only one hull before the others burn up.',
  arlenFederation:
    'Losing side of the Last Holdings War. Known for durable, highly modular ships.',
  martecStellarTrust: {
    officialName: 'Martec Stellar Trust & Associated Holdings',
    summary: 'Winning corporate power from the Last Holdings War.',
    terminology: [
      'Trust Enforcement Division',
      'Asset Protection',
      'Management Oversight',
      'Primary Articles of Trust',
      'Beneficiaries'
    ]
  }
};

const baseCompartments = {
  hull: { condition: 80, status: 'Worn' },
  bridge: { condition: 82, status: 'Worn' },
  reactor: { condition: 74, status: 'Damaged' },
  engines: { condition: 79, status: 'Worn' },
  lifeSupport: { condition: 86, status: 'Operational' },
  cargoBay: { condition: 88, status: 'Operational' },
  crewQuarters: { condition: 84, status: 'Worn' },
  engineeringBay: { condition: 76, status: 'Damaged' },
  sensors: { condition: 81, status: 'Worn' },
  weaponsBay: { condition: 80, status: 'Worn' },
  medicalBay: { condition: 90, status: 'Operational' }
};

export const starterShips = [
  {
    id: 'old-freighter',
    name: 'TSV Iron Ledger',
    registry: 'NC-4471',
    hullClass: 'Pre-Century Arlen Federation Modular Freighter',
    role: 'freight / salvage hauling / company growth',
    manufacturer: 'Vega Heavyworks',
    age: 27,
    description: 'High-capacity hauler with chronic maintenance needs.',
    bestCareerFit: 'Freight and salvage economy growth.',
    minCrew: 4,
    optimalCrew: 8,
    maxCrew: 12,
    officerSlots: 4,
    fuelCapacity: 120,
    startingFuel: 82,
    cargoCapacity: 240,
    moduleSlotsSummary: '6 utility / 2 hardpoint',
    quirks: ['Slow acceleration', 'Weak combat posture', 'Maintenance hungry'],
    compartments: baseCompartments
  },
  {
    id: 'old-corvette',
    name: 'TSV Boundary Mark',
    registry: 'NC-2290',
    hullClass: 'Pre-Century Arlen Federation Patrol Corvette',
    role: 'patrol / escort / flexible generalist',
    manufacturer: 'Kestral Defense Yards',
    age: 19,
    description: 'Balanced combat-capable hull with moderate hold.',
    bestCareerFit: 'General contracts and mixed-risk routes.',
    minCrew: 3,
    optimalCrew: 6,
    maxCrew: 9,
    officerSlots: 3,
    fuelCapacity: 95,
    startingFuel: 70,
    cargoCapacity: 130,
    moduleSlotsSummary: '5 utility / 3 hardpoint',
    quirks: ['Reliable armor', 'Tight berthing', 'Legacy targeting bus'],
    compartments: {
      ...baseCompartments,
      hull: { condition: 83, status: 'Worn' },
      reactor: { condition: 82, status: 'Worn' },
      engineeringBay: { condition: 84, status: 'Worn' },
      weaponsBay: { condition: 73, status: 'Damaged' }
    }
  },
  {
    id: 'old-cutter',
    name: 'TSV Needle Path',
    registry: 'NC-7712',
    hullClass: 'Pre-Century Arlen Federation Survey Cutter',
    role: 'survey / courier / exploration',
    manufacturer: 'Aster Reach Labs',
    age: 14,
    description: 'Fast courier hull with limited carry and fragility.',
    bestCareerFit: 'Survey, courier, and exploration loops.',
    minCrew: 2,
    optimalCrew: 4,
    maxCrew: 6,
    officerSlots: 2,
    fuelCapacity: 80,
    startingFuel: 62,
    cargoCapacity: 70,
    moduleSlotsSummary: '4 utility / 1 hardpoint',
    quirks: ['High sprint speed', 'Fragile frame', 'Excellent navigation suite'],
    compartments: {
      ...baseCompartments,
      hull: { condition: 76, status: 'Damaged' },
      engines: { condition: 72, status: 'Damaged' },
      sensors: { condition: 75, status: 'Worn' },
      crewQuarters: { condition: 78, status: 'Worn' }
    }
  }
];

export const starterShipsById = Object.fromEntries(starterShips.map((s) => [s.id, s]));
