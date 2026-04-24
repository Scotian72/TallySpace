export default class RNG {
  constructor(seed = Date.now()) {
    this.modulus = 2 ** 31;
    this.multiplier = 1103515245;
    this.increment = 12345;
    this.state = seed % this.modulus;

    if (this.state <= 0) {
      this.state += this.modulus - 1;
    }
  }

  next() {
    this.state = (this.multiplier * this.state + this.increment) % this.modulus;
    return this.state / this.modulus;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min, max) {
    return this.next() * (max - min) + min;
  }

  pick(items) {
    if (!items.length) {
      return undefined;
    }
    return items[this.int(0, items.length - 1)];
  }
}
