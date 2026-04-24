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

  log(company, { day, type, message, metadata = {} }) {
    const event = {
      day,
      type,
      message,
      metadata,
      timestamp: Date.now()
    };

    company.eventLog.unshift(event);
    company.eventLog = company.eventLog.slice(0, 300);

    this.emit(event);
    return event;
  }
}
