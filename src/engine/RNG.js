export default class RNG {
  constructor(seed = 123456789) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(array) {
    if (!array.length) return null;
    return array[this.nextInt(0, array.length - 1)];
  }
}
