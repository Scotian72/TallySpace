export default class UIController {
  constructor() {
    this.dayEl = document.getElementById('current-day');
    this.cashEl = document.getElementById('company-cash');
    this.shipCountEl = document.getElementById('ship-count');
    this.crewCountEl = document.getElementById('crew-count');
    this.logEl = document.getElementById('event-log');
    this.advanceOneBtn = document.getElementById('advance-1-day');
    this.advanceTenBtn = document.getElementById('advance-10-days');
  }

  bindAdvanceHandlers(onAdvanceOne, onAdvanceTen) {
    this.advanceOneBtn.addEventListener('click', onAdvanceOne);
    this.advanceTenBtn.addEventListener('click', onAdvanceTen);
  }

  renderState({ day, company }) {
    this.dayEl.textContent = String(day);
    this.cashEl.textContent = `$${company.cash.toLocaleString()}`;
    this.shipCountEl.textContent = String(company.fleet.length);
    this.crewCountEl.textContent = String(company.crew.length);

    this.logEl.innerHTML = '';
    company.eventLog.forEach((entry) => {
      const item = document.createElement('li');
      item.textContent = entry;
      this.logEl.appendChild(item);
    });
  }
}
