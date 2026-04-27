export default class Company {
  constructor({ name, startingCash = 100000 }) {
    this.name = name;
    this.cash = startingCash;
    this.fleet = [];
    this.crew = [];
    this.availableCrew = [];
    this.eventLog = [];
  }

  addShip(ship) {
    this.fleet.push(ship);
  }

  addCrewMember(crewMember) {
    this.crew.push(crewMember);
  }

  addRecruitmentCandidates(candidates) {
    this.availableCrew.push(...candidates);
  }

  removeRecruitmentCandidate(index) {
    if (index < 0 || index >= this.availableCrew.length) {
      return null;
    }

    const [candidate] = this.availableCrew.splice(index, 1);
    return candidate;
  }

  hireCandidate(index) {
    const candidate = this.availableCrew[index];
    if (!candidate || this.cash < candidate.wage) {
      return null;
    }

    this.cash -= candidate.wage;
    const hiredCrew = this.removeRecruitmentCandidate(index);
    this.addCrewMember(hiredCrew);
    return hiredCrew;
  }

  logEvent(message, day) {
    const entry = `Day ${day}: ${message}`;
    this.eventLog.unshift(entry);
    this.eventLog = this.eventLog.slice(0, 500);
    return entry;
  }
}
