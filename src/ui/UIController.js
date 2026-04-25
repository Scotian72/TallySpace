export default class UIController {
  constructor() {
    this.dayEl = document.getElementById('current-day');
    this.cashEl = document.getElementById('company-cash');
    this.shipCountEl = document.getElementById('ship-count');
    this.crewCountEl = document.getElementById('crew-count');
    this.logEl = document.getElementById('event-log');
    this.companyCrewEl = document.getElementById('company-crew');
    this.recruitmentEl = document.getElementById('recruitment-list');
    this.advanceOneBtn = document.getElementById('advance-1-day');
    this.advanceTenBtn = document.getElementById('advance-10-days');
    this.restCrewBtn = document.getElementById('rest-crew');
    this.shipModeSelect = document.getElementById('ship-mode');
  }

  bindAdvanceHandlers(onAdvanceOne, onAdvanceTen) {
    this.advanceOneBtn.addEventListener('click', onAdvanceOne);
    this.advanceTenBtn.addEventListener('click', onAdvanceTen);
  }

  bindCrewActions({ onHire, onAssignCaptain }) {
    this.recruitmentEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="hire"]');
      if (!button) {
        return;
      }
      onHire(Number(button.dataset.index));
    });

    this.companyCrewEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="assign-captain"]');
      if (!button) {
        return;
      }
      onAssignCaptain(Number(button.dataset.index));
    });
  }

  bindShipActions({ onRestCrew, onChangeShipMode }) {
    this.restCrewBtn.addEventListener('click', onRestCrew);
    this.shipModeSelect.addEventListener('change', (event) => {
      onChangeShipMode(event.target.value);
    });
  }

  renderState({ day, company }) {
    this.dayEl.textContent = String(day);
    this.cashEl.textContent = `$${company.cash.toLocaleString()}`;
    this.shipCountEl.textContent = String(company.fleet.length);
    this.crewCountEl.textContent = String(company.crew.length);
    this.shipModeSelect.value = company.fleet[0]?.operationMode ?? 'NORMAL';

    this.renderCompanyCrew(company);
    this.renderRecruitment(company);
    this.renderEvents(company);
  }

  renderCompanyCrew(company) {
    this.companyCrewEl.innerHTML = '';

    company.crew.forEach((crewMember, index) => {
      const item = document.createElement('li');
      item.className = 'crew-card';

      const captainLabel = crewMember.isCaptain ? ' (Captain)' : '';
      const fatigueWarning = crewMember.fatigue >= 100
        ? '<p class="warning-text">Exhausted: effectiveness reduced</p>'
        : crewMember.fatigue >= 80
          ? '<p class="warning-text">Warning: high fatigue</p>'
          : '';
      const fatigueClass = crewMember.fatigue >= 80 ? ' crew-card--fatigued' : '';
      item.innerHTML = `
        <div class="crew-meta${fatigueClass}">
          <strong>${crewMember.name}${captainLabel}</strong>
          <p>Cmd ${crewMember.attributes.command} • Nav ${crewMember.attributes.navigation} • Eng ${crewMember.attributes.engineering}</p>
          <p>Morale ${crewMember.morale} • Fatigue ${crewMember.fatigue} • Loyalty ${crewMember.loyalty} • Wage $${crewMember.wage}</p>
          ${fatigueWarning}
        </div>
        <button type="button" data-action="assign-captain" data-index="${index}">Assign Captain</button>
      `;

      this.companyCrewEl.appendChild(item);
    });
  }

  renderRecruitment(company) {
    this.recruitmentEl.innerHTML = '';

    company.availableCrew.slice(0, 5).forEach((candidate, index) => {
      const item = document.createElement('li');
      item.className = 'crew-card';
      item.innerHTML = `
        <div>
          <strong>${candidate.name}</strong>
          <p>Cmd ${candidate.attributes.command} • Nav ${candidate.attributes.navigation} • Eng ${candidate.attributes.engineering}</p>
          <p>Morale ${candidate.morale} • Fatigue ${candidate.fatigue} • Loyalty ${candidate.loyalty} • Wage $${candidate.wage}</p>
        </div>
        <button type="button" data-action="hire" data-index="${index}">Hire</button>
      `;
      this.recruitmentEl.appendChild(item);
    });

    if (!company.availableCrew.length) {
      const item = document.createElement('li');
      item.textContent = 'No candidates currently available.';
      this.recruitmentEl.appendChild(item);
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
