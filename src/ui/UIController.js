import { species, speciesLegend } from '../data/species.js';
function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCrewRole(crewMember) {
  if (crewMember.isCaptain) return 'Captain';
  const { command, engineering, navigation } = crewMember.attributes;
  if (engineering >= command && engineering >= navigation) return 'Engineer';
  if (navigation >= command && navigation >= engineering) return 'Navigator';
  return crewMember.resolve < 45 ? 'Security' : 'Operations';
}

function getSpeciesLabel(crewMember) {
  const item = species[crewMember.species] ?? species.human;
  return `${item.name} (${item.code})`;
}

function buildCrewPoolBreakdown(company) {
  const buckets = { command: [], engineering: [], navigation: [] };
  company.crew.forEach((crew) => {
    const role = getCrewRole(crew).toLowerCase();
    const key = role.includes('engineer') ? 'engineering' : role.includes('navigator') ? 'navigation' : 'command';
    buckets[key].push(crew);
  });

  return Object.entries(buckets).map(([pool, members]) => {
    const speciesCounts = members.reduce((acc, member) => {
      const key = member.species ?? 'human';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(speciesCounts).map(([key, count]) => `${count}${species[key]?.code ?? '?'}`).join(' / ');
    return `${pool[0].toUpperCase()}${pool.slice(1)}: ${members.length}${summary ? ` (${summary})` : ''}`;
  });
}

function getCrewStatusTag(crewMember) {
  if (crewMember.fatigue >= 80) return 'Exhausted';
  if (crewMember.morale >= 80 && crewMember.loyalty >= 65) return 'Motivated';
  if (crewMember.morale <= 30 || crewMember.resolve <= 35) return 'Unstable';
  return 'Reliable';
}

function getPersonalityHint(crewMember) {
  if (crewMember.riskTolerance <= 35 || crewMember.traits.includes('Cautious')) return 'Prefers safe routes';
  if (crewMember.riskTolerance >= 70 || crewMember.traits.includes('Reckless')) return 'Pushes for risky contracts';
  if (crewMember.fatigue >= 70) return 'Needs rest soon';
  if (crewMember.traits.includes('Loyal')) return 'Committed to the company';
  return 'Balanced decision-maker';
}

function parseLogEntry(entry) {
  const match = entry.match(/^Day (\d+):\s*(.*)$/);
  if (!match) return { day: 'Unknown', message: entry };
  return { day: Number(match[1]), message: match[2] };
}

function getLogIcon(message) {
  const lower = message.toLowerCase();
  if (lower.includes('paid') || lower.includes('cost') || lower.includes('earned') || lower.includes('cash') || lower.includes('payout')) return '💰';
  if (lower.includes('travel') || lower.includes('departed') || lower.includes('arrived') || lower.includes('eta') || lower.includes('transit')) return '🚀';
  if (lower.includes('crew') || lower.includes('captain') || lower.includes('morale') || lower.includes('fatigue') || lower.includes('leveled')) return '👨‍🚀';
  if (lower.includes('repair') || lower.includes('integrity')) return '🔧';
  if (lower.includes('cannot') || lower.includes('blocked') || lower.includes('stranded') || lower.includes('failed') || lower.includes('warning')) return '⚠️';
  return '•';
}

export default class UIController {
  constructor() {
    this.titleEl = document.getElementById('game-title');
    this.statusMessageEl = document.getElementById('status-message');
    this.dayEl = document.getElementById('current-day');
    this.cashEl = document.getElementById('company-cash');
    this.shipCountEl = document.getElementById('ship-count');
    this.crewCountEl = document.getElementById('crew-count');
    this.alertBannerEl = document.getElementById('alert-banners');
    this.loopHintEl = document.getElementById('player-loop-hint');

    this.commandShipNameEl = document.getElementById('command-ship-name');
    this.commandLocationEl = document.getElementById('command-location');
    this.commandCaptainEl = document.getElementById('command-captain');
    this.commandStatusEl = document.getElementById('command-status');
    this.commandActiveContractEl = document.getElementById('command-active-contract');
    this.commandBurnEl = document.getElementById('command-burn');
    this.commandProjectionEl = document.getElementById('command-projection');
    this.commandTravelHeadlineEl = document.getElementById('travel-headline');
    this.commandTravelEtaEl = document.getElementById('travel-eta');
    this.commandProgressFillEl = document.getElementById('command-progress-fill');
    this.commandProgressLabelEl = document.getElementById('command-progress-label');

    this.shipFuelEl = document.getElementById('ship-fuel');
    this.locationEl = document.getElementById('ship-location');
    this.readinessEl = document.getElementById('ship-readiness');
    this.integrityEl = document.getElementById('ship-integrity');
    this.shipModeSelect = document.getElementById('ship-mode');
    this.wageBurdenEl = document.getElementById('wage-burden');

    this.dailyWagesEl = document.getElementById('fin-daily-wages');
    this.recentFuelEl = document.getElementById('fin-fuel-cost');
    this.recentRepairEl = document.getElementById('fin-repair-cost');
    this.netTenDaysEl = document.getElementById('fin-net-10');
    this.bankruptProjectionEl = document.getElementById('fin-bankrupt');

    this.logEl = document.getElementById('event-log');
    this.companyCrewEl = document.getElementById('company-crew');
    this.recruitmentEl = document.getElementById('recruitment-list');
    this.contractBoardEl = document.getElementById('contract-board');
    this.contractBriefingEl = document.getElementById('mission-briefing');
    this.systemDescEl = document.getElementById('system-description');
    this.destinationsEl = document.getElementById('destinations-list');

    this.advanceOneBtn = document.getElementById('advance-1-day');
    this.advanceTenBtn = document.getElementById('advance-10-days');
    this.restCrewBtn = document.getElementById('rest-crew');
    this.refuelShipBtn = document.getElementById('refuel-ship');
    this.repairShipBtn = document.getElementById('repair-ship');
    this.exportDataBtn = document.getElementById('export-data');
    this.copyExportDataBtn = document.getElementById('copy-export-json');
    this.repairDamagedBtn = document.getElementById('repair-damaged');
    this.performMaintenanceBtn = document.getElementById('perform-maintenance');
    this.commandMissionPhaseEl = document.getElementById('command-mission-phase');
    this.missionsBadgeEl = document.getElementById('missions-badge');
    this.runBot30Btn = document.getElementById('run-bot-30');
    this.runBot100Btn = document.getElementById('run-bot-100');
    this.runBot365Btn = document.getElementById('run-bot-365');
    this.exportBotReportBtn = document.getElementById('export-bot-report');
    this.stopBotBtn = document.getElementById('stop-bot');
    this.botStatusEl = document.getElementById('bot-status');
    this.botDayEl = document.getElementById('bot-day');
    this.botActionEl = document.getElementById('bot-action');
    this.botFailureEl = document.getElementById('bot-failure');

    this.selectedContractId = null;
    this.bound = { tabs: false, advance: false, crew: false, ship: false, contract: false, export: false, devTools: false }; 
    this.tabEls = [...document.querySelectorAll('.tab-btn')];
    this.panelEls = [...document.querySelectorAll('.tab-panel')];
    this.bindTabs();
  }


  bindTabs() {
    if (this.bound.tabs) return;
    this.bound.tabs = true;
    const show = (tab) => {
      this.tabEls.forEach((b)=>b.classList.toggle('active', b.dataset.tab===tab));
      this.panelEls.forEach((p)=>p.classList.toggle('active', p.dataset.panel===tab));
    };
    this.tabEls.forEach((btn)=>btn.addEventListener('click', ()=>show(btn.dataset.tab)));
    show('command');
  }

  setTitle(text) { this.titleEl.textContent = text; }
  setStatus(message) { this.statusMessageEl.textContent = message; }

  bindAdvanceHandlers(onAdvanceOne, onAdvanceTen) {
    if (this.bound.advance) return;
    this.bound.advance = true;
    this.advanceOneBtn?.addEventListener('click', onAdvanceOne);
    this.advanceTenBtn?.addEventListener('click', onAdvanceTen);
  }

  bindCrewActions({ onHire, onAssignCaptain }) {
    if (this.bound.crew) return;
    this.bound.crew = true;
    this.recruitmentEl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="hire"]');
      if (button) onHire(Number(button.dataset.index));
    });

    this.companyCrewEl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="assign-captain"]');
      if (button) onAssignCaptain(Number(button.dataset.index));
    });
  }

  bindShipActions({ onRestCrew, onChangeShipMode, onRefuelShip, onRepairShip, onTravel }) {
    if (this.bound.ship) return;
    this.bound.ship = true;
    this.restCrewBtn?.addEventListener('click', onRestCrew);
    this.refuelShipBtn?.addEventListener('click', onRefuelShip);
    this.repairShipBtn?.addEventListener('click', onRepairShip);
    this.repairDamagedBtn?.addEventListener('click', onRepairShip);
    this.performMaintenanceBtn?.addEventListener('click', onRepairShip);
    this.shipModeSelect?.addEventListener('change', (event) => onChangeShipMode(event.target.value));
    this.destinationsEl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="travel"]');
      if (button) onTravel(button.dataset.destination);
    });
  }

  bindContractActions({ onSelectContract, onAcceptContract }) {
    if (this.bound.contract) return;
    this.bound.contract = true;
    this.contractBoardEl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="select-contract"]');
      if (!button) return;
      this.selectedContractId = button.dataset.id;
      onSelectContract(this.selectedContractId);
    });

    this.contractBriefingEl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="accept-selected-contract"]');
      if (!button || !this.selectedContractId) return;
      onAcceptContract(this.selectedContractId);
    });
  }

  bindExportActions({ onExportData, onCopyExportData }) {
    if (this.bound.export) return;
    this.bound.export = true;
    this.exportDataBtn?.addEventListener('click', onExportData);
    this.copyExportDataBtn?.addEventListener('click', onCopyExportData);
  }


  bindDevToolsActions({ onRunBot30, onRunBot100, onRunBot365, onExportBotReport, onStopBot }) {
    if (this.bound.devTools) return;
    this.bound.devTools = true;
    this.runBot30Btn?.addEventListener('click', onRunBot30);
    this.runBot100Btn?.addEventListener('click', onRunBot100);
    this.runBot365Btn?.addEventListener('click', onRunBot365);
    this.exportBotReportBtn?.addEventListener('click', onExportBotReport);
    this.stopBotBtn?.addEventListener('click', onStopBot);
  }

  setBotStatus({ isRunning, day, lastAction, failureReason }) {
    if (this.botStatusEl) this.botStatusEl.textContent = isRunning ? 'RUNNING' : 'IDLE';
    if (this.botDayEl) this.botDayEl.textContent = String(day ?? 0);
    if (this.botActionEl) this.botActionEl.textContent = lastAction ?? '-';
    if (this.botFailureEl) this.botFailureEl.textContent = failureReason || '-';
  }

  renderState({ day, company, systemsById, contracts, metrics, selectedContractId }) {
    const ship = company.fleet[0];
    const currentSystem = systemsById[ship.location];
    this.selectedContractId = selectedContractId ?? this.selectedContractId;

    this.dayEl.textContent = String(day);
    this.cashEl.textContent = `$${company.cash.toLocaleString()}`;
    this.shipCountEl.textContent = String(company.fleet.length);
    this.crewCountEl.textContent = String(company.crew.length);
    this.shipFuelEl.textContent = ship ? `${ship.fuel}/${ship.fuelCapacity}` : '0/0';
    this.locationEl.textContent = currentSystem?.name ?? 'Unknown';
    this.readinessEl.textContent = ship.getReadiness();
    this.integrityEl.textContent = `${ship.integrity}%`;
    const quirks = ship.quirks?.length ? ` | Quirks: ${ship.quirks.join(', ')}` : '';
    this.readinessEl.title = `Compartments E:${ship.compartments?.engines ?? '-'} LS:${ship.compartments?.lifeSupport ?? '-'} S:${ship.compartments?.sensors ?? '-'}${quirks}`;
    this.wageBurdenEl.textContent = `$${metrics.dailyWages.toLocaleString()}/day`;
    this.systemDescEl.textContent = currentSystem?.description ?? '-';
    this.shipModeSelect.value = ship?.operationMode ?? 'NORMAL';

    this.loopHintEl.textContent = ship.activeContract || ship.travelPlan
      ? 'Focus: Monitor progress, keep fuel/integrity stable, and prepare your next contract.'
      : 'If idle: → Accept a contract → Travel to a new system → Manage crew';

    this.renderAlerts(metrics.alerts);
    this.renderCommandStatus(ship, company, systemsById, metrics);
    this.renderFinancials(metrics);
    this.renderDestinations(ship, currentSystem, systemsById);
    this.renderCompanyCrew(company);
    this.renderRecruitment(company);
    this.renderContracts(contracts, systemsById, this.selectedContractId);
    if (this.missionsBadgeEl) this.missionsBadgeEl.textContent = String(contracts.length);
    this.renderMissionBriefing(contracts, systemsById, ship, this.selectedContractId);
    this.renderEvents(company);
  }

  renderAlerts(alerts) {
    this.alertBannerEl.innerHTML = '';
    alerts.forEach((alert) => {
      const item = document.createElement('div');
      item.className = `alert alert--${alert.level}`;
      item.textContent = `${alert.label}: ${alert.message}`;
      this.alertBannerEl.appendChild(item);
    });
  }

  renderCommandStatus(ship, company, systemsById, metrics) {
    const currentSystem = systemsById[ship.location];
    const captainSummary = ship.captain ? `${ship.captain.name} — ${ship.captain.archetype}` : 'No captain assigned';

    this.commandShipNameEl.textContent = ship.name;
    this.commandLocationEl.textContent = currentSystem?.name ?? 'Unknown';
    this.commandCaptainEl.textContent = captainSummary;
    this.commandStatusEl.textContent = metrics.commandState;
    this.commandStatusEl.className = `command-status-text command-${metrics.commandState.toLowerCase().replace(/\s+/g, '-')}`;

    if (ship.activeContract) {
      const destination = systemsById[ship.activeContract.destination];
      const remaining = ship.travelPlan?.daysRemaining ?? ship.activeContract.durationDays;
      this.commandActiveContractEl.innerHTML = `<strong>${ship.activeContract.type}</strong> → ${destination.name}<br>Days remaining: ${remaining} • Payout: $${ship.activeContract.payout.toLocaleString()} • Risk: ${ship.activeContract.risk}`;
    } else {
      this.commandActiveContractEl.textContent = 'No active contract';
    }

    this.commandBurnEl.textContent = `$${metrics.dailyBurn.toLocaleString()}/day burn`;
    this.commandProjectionEl.textContent = metrics.netProjection;
    this.commandProjectionEl.className = `projection ${metrics.netProjectionType}`;

    this.commandTravelHeadlineEl.textContent = metrics.travelHeadline;
    if (this.commandMissionPhaseEl) this.commandMissionPhaseEl.textContent = ship.activeContract ? (ship.travelPlan ? 'EN_ROUTE' : 'ACCEPTED') : this.selectedContractId ? 'SELECTED' : 'IDLE';
    this.commandTravelEtaEl.textContent = metrics.travelEta;
    this.commandProgressFillEl.style.width = `${clampPercent(metrics.progressPercent)}%`;
    this.commandProgressLabelEl.textContent = `${clampPercent(metrics.progressPercent)}% complete`;
  }

  renderFinancials(metrics) {
    this.dailyWagesEl.textContent = `$${metrics.dailyWages.toLocaleString()}/day`;
    this.recentFuelEl.textContent = `$${metrics.recentFuelCost.toLocaleString()} (10d)`;
    this.recentRepairEl.textContent = `$${metrics.recentRepairCost.toLocaleString()} (10d)`;
    const netPrefix = metrics.netIncome10Days >= 0 ? '+' : '';
    this.netTenDaysEl.textContent = `${netPrefix}$${metrics.netIncome10Days.toLocaleString()}`;
    this.bankruptProjectionEl.textContent = metrics.bankruptProjection;
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
          <div class="crew-head">
            <strong>${crewMember.name}</strong>
            <span class="tag">${getCrewStatusTag(crewMember)}</span>
          </div>
          <p class="subtext">${crewMember.archetype} • ${getSpeciesLabel(crewMember)}</p>
          <p class="subtext">Role: ${getCrewRole(crewMember)}${crewMember.isCaptain ? ' (Captain)' : ''}</p>
          <p>Personality: ${getPersonalityHint(crewMember)}</p>
          <p>Traits: ${crewMember.traits.join(', ')}</p>
          <div class="mini-bars">
            <label>Morale <span>${crewMember.morale}</span></label><div class="mini-bar"><span style="width:${crewMember.morale}%"></span></div>
            <label>Fatigue <span>${crewMember.fatigue}</span></label><div class="mini-bar danger"><span style="width:${crewMember.fatigue}%"></span></div>
            <label>Loyalty <span>${crewMember.loyalty}</span></label><div class="mini-bar loyalty"><span style="width:${crewMember.loyalty}%"></span></div>
          </div>
          <p class="subtext">Lvl ${crewMember.level} • Wage $${crewMember.wage} • Cmd ${crewMember.attributes.command} • Nav ${crewMember.attributes.navigation} • Eng ${crewMember.attributes.engineering}</p>
        </div>
        <button type="button" data-action="assign-captain" data-index="${index}">Assign Captain</button>`;
      this.companyCrewEl.appendChild(item);
    });
  }

  renderRecruitment(company) {
    this.recruitmentEl.innerHTML = '';
    const pools = buildCrewPoolBreakdown(company);
    if (pools.length) {
      const pool = document.createElement('li');
      pool.className = 'crew-card';
      pool.innerHTML = `<div><strong>Crew Pools</strong><p class="subtext">${pools.join(' • ')}</p><p class="subtext" title="${speciesLegend.join(', ')}">Legend: ${speciesLegend.join(' | ')}</p></div>`;
      this.recruitmentEl.appendChild(pool);
    }
    company.availableCrew.slice(0, 5).forEach((candidate, index) => {
      const item = document.createElement('li');
      item.className = 'crew-card';
      item.innerHTML = `<div><strong>${candidate.name}</strong><p class="subtext">${candidate.archetype} • ${getSpeciesLabel(candidate)}</p><p>Traits: ${candidate.traits.join(', ')}</p><p>Role fit: ${candidate.rolePreference}</p><p>Wage $${candidate.wage}</p></div><button type="button" data-action="hire" data-index="${index}">Hire</button>`;
      this.recruitmentEl.appendChild(item);
    });
    if (!company.availableCrew.length) {
      const item = document.createElement('li');
      item.textContent = 'No candidates currently available.';
      this.recruitmentEl.appendChild(item);
    }
  }

  renderContracts(contracts, systemsById, selectedContractId) {
    this.contractBoardEl.innerHTML = '';
    contracts.forEach((contract) => {
      const selectedClass = selectedContractId === contract.id ? ' card--selected' : '';
      const riskBand = contract.risk >= 70 ? 'HIGH' : contract.risk >= 40 ? 'MODERATE' : 'LOW';
      const item = document.createElement('li');
      item.className = `card${selectedClass}`;
      item.innerHTML = `<div><strong>${contract.type}</strong><p>${systemsById[contract.origin].name} → ${systemsById[contract.destination].name}</p><p>Payout $${contract.payout} • Risk ${contract.risk} (${riskBand}) • ${contract.durationDays} day(s)</p><p class="subtext">${contract.description}</p></div><button data-action="select-contract" data-id="${contract.id}">${selectedContractId === contract.id ? 'Selected' : 'Select Mission'}</button>`;
      this.contractBoardEl.appendChild(item);
    });
    if (!contracts.length) {
      const item = document.createElement('li');
      item.textContent = 'No contracts available right now.';
      this.contractBoardEl.appendChild(item);
    }
  }

  renderMissionBriefing(contracts, systemsById, ship, selectedContractId) {
    const contract = contracts.find((c) => c.id === selectedContractId);
    if (!contract) {
      this.contractBriefingEl.innerHTML = '<p class="subtext">Select a contract to view mission briefing.</p>';
      return;
    }

    const riskOutcome = contract.risk >= 70 ? 'HIGH chance of incident' : contract.risk >= 40 ? 'MODERATE chance of incident' : 'LOW chance of incident';
    const fatigueMin = 10 + Math.round(contract.risk / 8);
    const fatigueMax = fatigueMin + 10;
    const moraleMin = Math.max(-15, 5 - Math.round(contract.risk / 6));
    const moraleMax = moraleMin + 15;

    this.contractBriefingEl.innerHTML = `
      <h3>MISSION BRIEFING PANEL</h3>
      <p><strong>Route:</strong> ${systemsById[contract.origin].name} → ${systemsById[contract.destination].name}</p>
      <p><strong>Estimated Days:</strong> ${contract.durationDays}</p>
      <p><strong>Fuel Required:</strong> ${contract.requiredFuelMinimum}</p>
      <p><strong>Risk Outcome:</strong> ${riskOutcome}</p>
      <p><strong>Crew Impact Prediction:</strong> Fatigue +${fatigueMin}–${fatigueMax} • Morale ${moraleMin} to +${moraleMax}</p>
      <p class="subtext">Ship ready state: ${ship.getReadiness()}</p>
      <button data-action="accept-selected-contract">ACCEPT MISSION</button>
    `;
  }

  renderEvents(company) {
    this.logEl.innerHTML = '';
    const grouped = new Map();
    company.eventLog.slice(0, 50).forEach((entry) => {
      const parsed = parseLogEntry(entry);
      const dayKey = parsed.day;
      if (!grouped.has(dayKey)) grouped.set(dayKey, []);
      grouped.get(dayKey).push(parsed.message);
    });

    grouped.forEach((messages, day) => {
      const dayItem = document.createElement('li');
      dayItem.className = 'event-day';
      const details = messages.map((message) => `<li>${getLogIcon(message)} ${message}</li>`).join('');
      dayItem.innerHTML = `<strong>Day ${day}</strong><ul>${details}</ul>`;
      this.logEl.appendChild(dayItem);
    });
  }
}
