export default class GameLoop {
  constructor({ onDayAdvance }) {
    this.day = 1;
    this.onDayAdvance = onDayAdvance;
  }

  advanceDay() {
    this.day += 1;
    if (this.onDayAdvance) {
      this.onDayAdvance(this.day);
    }
    return this.day;
  }

  advanceDays(count = 1) {
    for (let i = 0; i < count; i += 1) {
      this.advanceDay();
    }
    return this.day;
  }
}
