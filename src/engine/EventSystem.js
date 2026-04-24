export default class EventSystem {
  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
    this.events = [];
  }

  log(day, message, type = 'info') {
    const entry = {
      day,
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    this.events.push(entry);
    if (this.events.length > this.maxEntries) {
      this.events.shift();
    }

    return entry;
  }

  getAll() {
    return [...this.events];
  }
}
