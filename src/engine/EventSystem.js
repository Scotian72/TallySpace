export default class EventSystem {
  constructor() {
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  emit(event) {
    this.listeners.forEach((listener) => listener(event));
  }

  emitLog(company, message, day) {
    const entry = company.logEvent(message, day);
    this.emit({ type: 'log', day, message, entry });
  }
}
