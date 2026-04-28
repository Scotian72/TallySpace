export default class UIController {
  constructor() {
    this.titleEl = document.getElementById('game-title');
    this.statusMessageEl = document.getElementById('status-message');
    this.dayEl = document.getElementById('current-day');
    this.cashEl = document.getElementById('company-cash');
    this.shipCountEl = document.getElementById('ship-count');
    this.crewCountEl = document.getElementById('crew-count');
    this.shipFuelEl = document.getElementById('ship-fuel');
    this.locationEl = document.getElementById('ship-location');
    this.readinessEl = document.getElementById('ship-readiness');
    this.integrityEl = document.getElementById('ship-integrity');
    this.captainEl = document.getElementById('ship-captain');
    this.activeContractEl = document.getElementById('ship-active-contract');
    this.wageBurdenEl = document.getElementById('wage-burden');
    this.logEl = document.getElementById('event-log');
    this.companyCrewEl = document.getElementById('company-crew');
    this.recruitmentEl = document.getElementById('recruitment-list');
    this.contractBoardEl = document.getElementById('contract-board');
    this.systemDescEl = document.getElementById('system-description');
    this.destinationsEl = document.getElementById('destinations-list');
    this.advanceOneBtn = document.getElementById('advance-1-day');
    this.advanceTenBtn = document.getElementById('advance-10-days');
    this.restCrewBtn = document.getElementById('rest-crew');
    this.refuelShipBtn = document.getElementById('refuel-ship');
    this.repairShipBtn = document.getElementById('repair-ship');
    this.exportDataBtn = document.getElementById('export-data');
    this.copyExportDataBtn = document.getElementById('copy-export-json');
    this.shipModeSelect = document.getElementById('ship-mode');
  }

  setTitle(text) { this.titleEl.textContent = text; }
  setStatus(message) { this.statusMessageEl.textContent = message; }

  bindAdvanceHandlers(onAdvanceOne, onAdvanceTen) {
    this.advanceOneBtn.addEventListener('click', onAdvanceOne);
    this.advanceTenBtn.addEventListener('click', onAdvanceTen);
  }

  bindCrewActions({ onHire, onAssignCaptain }) {
    this.recruitmentEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="hire"]');
      if (button) onHire(Number(button.dataset.index));
    });

    this.companyCrewEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="assign-captain"]');
      if (button) onAssignCaptain(Number(button.dataset.index));
    });
  }

  bindShipActions({ onRestCrew, onChangeShipMode, onRefuelShip, onRepairShip, onTravel }) {
    this.restCrewBtn.addEventListener('click', onRestCrew);
    this.refuelShipBtn.addEventListener('click', onRefuelShip);
    this.repairShipBtn.addEventListener('click', onRepairShip);
    this.shipModeSelect.addEventListener('change', (event) => onChangeShipMode(event.target.value));
    this.destinationsEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="travel"]');
      if (button) onTravel(button.dataset.destination);
    });
  }

  bindContractActions({ onAcceptContract }) {
    this.contractBoardEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="accept-contract"]');
      if (button) onAcceptContract(button.dataset.id);
    });
  }

  bindExportActions({ onExportData, onCopyExportData }) {
    this.exportDataBtn.addEventListener('click', onExportData);
    this.copyExportDataBtn.addEventListener('click', onCopyExportData);
  }

  renderState({ day, company, systemsById, contracts }) {
    const ship = company.fleet[0];
    const currentSystem = systemsById[ship.location];
    this.dayEl.textContent = String(day);
    this.cashEl.textContent = `$${company.cash.toLocaleString()}`;
    this.shipCountEl.textContent = String(company.fleet.length);
    this.crewCountEl.textContent = String(company.crew.length);
    this.shipFuelEl.textContent = ship ? `${ship.fuel}/${ship.fuelCapacity}` : '0/0';
    this.locationEl.textContent = currentSystem?.name ?? 'Unknown';
    this.readinessEl.textContent = ship.getReadiness();
    this.integrityEl.textContent = `${ship.integrity}%`;
    this.captainEl.textContent = ship.captain?.name ?? 'Unassigned';
    this.activeContractEl.textContent = ship.activeContract ? `${ship.activeContract.type} to ${systemsById[ship.activeContract.destination].name}` : 'None';
    this.wageBurdenEl.textContent = `$${company.crew.reduce((sum, c) => sum + c.wage, 0)}/day`;
    this.systemDescEl.textContent = currentSystem?.description ?? '-';
    this.shipModeSelect.value = ship?.operationMode ?? 'NORMAL';

    this.renderDestinations(ship, currentSystem, systemsById);
    this.renderCompanyCrew(company);
    this.renderRecruitment(company);
    this.renderContracts(contracts, systemsById);
    this.renderEvents(company);
  }

  renderDestinations(ship, currentSystem, systemsById) {
    this.destinationsEl.innerHTML = '';
    (currentSystem?.connectedSystems ?? []).forEach((id) => {
      const destination = systemsById[id];
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `<div><strong>${destination.name}</strong><p>Security ${destination.security} • Fuel $${destination.fuelPrice}</p></div><button data-action="travel" data-destination="${destination.id}">Travel</button>`;
      this.destinationsEl.appendChild(li);
    });
  }

  renderCompanyCrew(company) {
    this.companyCrewEl.innerHTML = '';
    company.crew.forEach((crewMember, index) => {
      const item = document.createElement('li');
      item.className = 'crew-card';
      item.innerHTML = `<div class="crew-meta${crewMember.fatigue >= 80 ? ' crew-card--fatigued' : ''}">
          <strong>${crewMember.name}${crewMember.isCaptain ? ' (Captain)' : ''}</strong>
          <p class="subtext">${crewMember.archetype}</p>
          <p>Traits: ${crewMember.traits.join(', ')}</p>
          <p>Lvl ${crewMember.level} • XP ${crewMember.experience} • Cmd ${crewMember.attributes.command} • Nav ${crewMember.attributes.navigation} • Eng ${crewMember.attributes.engineering}</p>
          <p>Morale ${crewMember.morale} • Fatigue ${crewMember.fatigue} • Resolve ${crewMember.resolve} • Wage $${crewMember.wage}</p>
          <p class="subtext">${crewMember.personalHistory}</p>
        </div>
        <button type="button" data-action="assign-captain" data-index="${index}">Assign Captain</button>`;
      this.companyCrewEl.appendChild(item);
    });
  }

  renderRecruitment(company) {
    this.recruitmentEl.innerHTML = '';
    company.availableCrew.slice(0, 5).forEach((candidate, index) => {
      const item = document.createElement('li');
      item.className = 'crew-card';
      item.innerHTML = `<div><strong>${candidate.name}</strong><p class="subtext">${candidate.archetype}</p><p>Traits: ${candidate.traits.join(', ')}</p><p>Lvl ${candidate.level} • Cmd ${candidate.attributes.command} • Nav ${candidate.attributes.navigation} • Eng ${candidate.attributes.engineering}</p><p>Wage $${candidate.wage}</p></div><button type="button" data-action="hire" data-index="${index}">Hire</button>`;
      this.recruitmentEl.appendChild(item);
    });
    if (!company.availableCrew.length) {
      const item = document.createElement('li');
      item.textContent = 'No candidates currently available.';
      this.recruitmentEl.appendChild(item);
    }
  }

  renderContracts(contracts, systemsById) {
    this.contractBoardEl.innerHTML = '';
    contracts.forEach((contract) => {
      const item = document.createElement('li');
      item.className = 'card';
      item.innerHTML = `<div><strong>${contract.type}</strong><p>${systemsById[contract.origin].name} → ${systemsById[contract.destination].name}</p><p>Payout $${contract.payout} • Risk ${contract.risk} • Expires Day ${contract.expiryDay}</p><p class="subtext">${contract.description}</p></div><button data-action="accept-contract" data-id="${contract.id}">Accept Contract</button>`;
      this.contractBoardEl.appendChild(item);
    });
    if (!contracts.length) {
      const item = document.createElement('li');
      item.textContent = 'No contracts available right now.';
      this.contractBoardEl.appendChild(item);
    }
  }

  renderEvents(company) {
    this.logEl.innerHTML = '';
    company.eventLog.forEach((entry) => {
      const item = document.createElement('li');
      item.textContent = entry;
      this.logEl.appendChild(item);
    });
  }
}
