import { runInvariantChecks } from './InvariantChecker.js';
import { createBotReport, finalizeBotReport } from './BotReport.js';

export default class AutoplayBot {
  constructor(ctx) { this.ctx = ctx; this.isRunning = false; this.shouldStop = false; this.lastAction = 'IDLE'; this.failureReason = ''; this.report = null; this.activeMissionDays = 0; }
  getStatus() { return { isRunning: this.isRunning, day: this.report?.daysCompleted ?? 0, lastAction: this.lastAction, failureReason: this.failureReason }; }
  stop(reason = 'STOPPED_BY_USER') { this.shouldStop = true; this.failureReason = reason; }

  run(daysRequested = 30) {
    const { gameLoop, company, ship, rngSeed } = this.ctx;
    this.report = createBotReport(rngSeed, daysRequested); this.isRunning = true; this.shouldStop = false; let prevDay = gameLoop.day;
    for (let i = 0; i < daysRequested; i += 1) {
      if (this.shouldStop) break;
      this.takeAction();
      gameLoop.advanceDay();
      this.report.daysCompleted += 1;
      const failures = runInvariantChecks({ ...this.ctx.getState(), day: gameLoop.day, prevDay, activeMissionDays: this.activeMissionDays, exportState: this.ctx.serializeGameState() });
      prevDay = gameLoop.day;
      if (failures.length) { this.report.invariantFailures.push({ day: gameLoop.day, reasons: failures, snapshot: this.ctx.serializeGameState() }); this.failureReason = failures[0]; break; }
    }
    this.report.stopReason = this.failureReason || (this.shouldStop ? 'STOPPED_BY_USER' : 'COMPLETED');
    finalizeBotReport(this.report, { company, ship });
    this.isRunning = false;
    return this.report;
  }

  takeAction() {
    const { ship, contracts, systemsById, actions, company } = this.ctx.getState();
    if (ship.travelPlan || ship.activeContract) { this.lastAction = 'ADVANCE_DAY'; this.activeMissionDays += ship.activeContract ? 1 : 0; return; }
    if (ship.fuel < Math.max(12, Math.round(ship.fuelCapacity * 0.2)) && company.cash > 0) { actions.refuelShip(); this.report.refuelsPerformed += 1; this.lastAction = 'REFUEL'; return; }
    const damage = Object.values(ship.compartments ?? {}).reduce((sum, v) => sum + (100 - v), 0);
    if (damage > 35 && company.cash > 0) { actions.repairShip(); this.report.repairsPerformed += 1; this.lastAction = 'REPAIR'; return; }
    const avgFatigue = company.crew.length ? company.crew.reduce((s, c) => s + c.fatigue, 0) / company.crew.length : 0;
    if (avgFatigue >= 75 && company.cash > 0) { actions.restCrew(); this.report.restsPerformed += 1; this.lastAction = 'REST'; return; }
    const pick = this.pickBestMission(contracts, ship, company);
    if (pick) { actions.acceptContract(pick.id); this.report.missionsAccepted += 1; this.lastAction = `ACCEPT_${pick.id}`; return; }
    const currentSystem = systemsById[ship.location];
    const next = (currentSystem?.connectedSystems ?? []).map((id) => systemsById[id]).sort((a, b) => b.security - a.security)[0];
    if (next && ship.fuel > 10) { actions.startTravel(next.id); this.lastAction = `TRAVEL_${next.id}`; return; }
    this.lastAction = 'NO_OP';
  }

  pickBestMission(contracts, ship, company) {
    const criticalCash = company.cash < 2500;
    const scored = (contracts ?? []).map((c) => {
      if (ship.location !== c.origin || company.crew.length < c.requiredCrewMinimum || ship.fuel < c.requiredFuelMinimum) return null;
      const score = (criticalCash ? c.payout / 80 : c.payout / 140) - (criticalCash ? c.risk / 10 : c.risk / 4) - (c.durationDays * 4) + (ship.integrity >= 60 ? 12 : -20);
      return { contract: c, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    return scored[0]?.contract ?? null;
  }
}
