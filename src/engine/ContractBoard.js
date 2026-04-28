const CONTRACT_TYPES = ['Freight', 'Passenger', 'Survey', 'Escort', 'Salvage Lead', 'Emergency Delivery'];

export default class ContractBoard {
  constructor({ rng, systemsById }) {
    this.rng = rng;
    this.systemsById = systemsById;
    this.contracts = [];
    this.lastRefreshDay = 0;
    this.nextId = 1;
  }

  refreshContracts(day, originSystemId) {
    this.contracts = this.contracts.filter((contract) => contract.expiryDay >= day);
    if (day - this.lastRefreshDay < 5 && this.contracts.length >= 3) {
      return;
    }

    const origin = this.systemsById[originSystemId];
    if (!origin) {
      return;
    }

    this.lastRefreshDay = day;
    const targetCount = this.rng.int(3, 6);
    const needed = Math.max(0, targetCount - this.contracts.length);

    for (let i = 0; i < needed; i += 1) {
      this.contracts.push(this.generateContract(day, origin));
    }
  }

  generateContract(day, origin) {
    const destinationId = this.rng.pick(origin.connectedSystems);
    const destination = this.systemsById[destinationId];
    const riskBase = Math.max(5, 100 - destination.security);
    const riskVariance = this.rng.int(-8, 12);
    const risk = Math.max(5, Math.min(95, riskBase + riskVariance));
    const durationDays = this.rng.int(2, 7);
    const type = this.pickType(origin.contractBias);
    const payout = Math.round((1800 + risk * 45 + durationDays * 350) * (1 + this.rng.int(-8, 10) / 100));
    const requiredCrewMinimum = Math.max(2, Math.round(risk / 25));
    const requiredFuelMinimum = Math.max(8, 6 + durationDays * 3 + Math.round(risk / 15));
    const expiryDay = day + this.rng.int(4, 9);

    return {
      id: `CT-${this.nextId++}`,
      type,
      origin: origin.id,
      destination: destination.id,
      payout,
      durationDays,
      risk,
      requiredCrewMinimum,
      requiredFuelMinimum,
      expiryDay,
      description: `${type} contract from ${origin.name} to ${destination.name}.`
    };
  }

  pickType(bias) {
    if (this.rng.next() < 0.45) {
      return bias;
    }
    return this.rng.pick(CONTRACT_TYPES);
  }

  acceptContract(contractId) {
    const idx = this.contracts.findIndex((contract) => contract.id === contractId);
    if (idx < 0) {
      return null;
    }

    const [contract] = this.contracts.splice(idx, 1);
    return contract;
  }
}
