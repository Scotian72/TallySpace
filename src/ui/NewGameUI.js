import { captainArchetypes } from '../data/captainArchetypes.js';
import { starterShips } from '../data/starterShips.js';

const ATTR_KEYS = ['command','piloting','navigation','engineering','tactical','security','medical','operations','negotiation','science','stewardship','administration','resolve'];
const PERSONALITY_KEYS = ['riskTolerance','discipline','greed','empathy','ambition','loyaltyBias','curiosity','fearThreshold'];
const ROLE_OPTIONS = ['Captain','XO','Pilot','Navigator','Chief Engineer','Engineer','Tactical Officer','Security Chief','Doctor','Medic','Broker','Steward','Quartermaster','Administrator','Operations Officer','Science Officer'];
const RELATIONSHIP_OPTIONS = ['childhood friend','former crewmate','saved your life','you saved their life','old rival','family-like bond','debt bond','academy/dockmate','business partner'];

const TEAM_MODES = {
  balanced: { label: 'Generate Balanced Team', pairs: [{ primaryRole: 'Pilot', secondaryRole: 'Navigator' }, { primaryRole: 'Chief Engineer', secondaryRole: 'Operations Officer' }] },
  salvage: { label: 'Generate Salvage Team', pairs: [{ primaryRole: 'Chief Engineer', secondaryRole: 'Operations Officer' }, { primaryRole: 'Pilot', secondaryRole: 'Security Chief' }] },
  freight: { label: 'Generate Freight Team', pairs: [{ primaryRole: 'Pilot', secondaryRole: 'Navigator' }, { primaryRole: 'Quartermaster', secondaryRole: 'Broker' }] },
  patrol: { label: 'Generate Patrol Team', pairs: [{ primaryRole: 'Tactical Officer', secondaryRole: 'Security Chief' }, { primaryRole: 'Pilot', secondaryRole: 'Medic' }] },
  survey: { label: 'Generate Survey Team', pairs: [{ primaryRole: 'Navigator', secondaryRole: 'Science Officer' }, { primaryRole: 'Chief Engineer', secondaryRole: 'Pilot' }] }
};

function createBaseAttributes(seed = 50) { return Object.fromEntries(ATTR_KEYS.map((k) => [k, seed])); }
function createBasePersonality(seed = 50) { return Object.fromEntries(PERSONALITY_KEYS.map((k) => [k, seed])); }

export default class NewGameUI {
  constructor({ rootEl, candidates, onStart }) {
    this.rootEl = rootEl; this.candidates = candidates; this.onStart = onStart; this.page = 0; this.quickMode = null;
    this.shipId = null;
    this.characters = { captain: this.makeCharacter('captain'), friend1: this.makeCharacter('friend1'), friend2: this.makeCharacter('friend2') };
  }

  makeCharacter(kind) {
    return {
      id: kind, name: '', species: 'human', archetype: kind === 'captain' ? captainArchetypes[0].name : 'Spacer',
      primaryRole: kind === 'captain' ? 'Captain' : 'Pilot', secondaryRole: kind === 'captain' ? 'Navigator' : 'Engineer',
      attributes: createBaseAttributes(), personality: createBasePersonality(), traits: [], commandStyle: 'Measured', backstory: '',
      wage: kind === 'captain' ? 0 : 160, morale: 70, fatigue: 15, loyalty: 65, relationship: kind === 'captain' ? null : 'former crewmate'
    };
  }

  mount() { this.render(); }

  render() {
    const ship = starterShips.find((s) => s.id === this.shipId);
    const roleCoverage = ship ? this.computeRoleCoverage(ship) : null;
    this.rootEl.innerHTML = `<section class='panel'><h2>New Game Setup</h2><h3>${['1. Captain','2. Friend 1','3. Friend 2','4. Starter Ship'][this.page]}</h3>
      <div id='page-body'></div><div class='controls'><button id='back-btn'>Back</button><button id='next-btn'>${this.page===3?'Start Company':'Next'}</button></div>
      <p id='setup-warning' class='warning'></p>${roleCoverage ? `<div class='panel'><h4>Role Coverage Preview</h4>${roleCoverage}</div>` : ''}</section>`;
    this.rootEl.querySelector('#back-btn').disabled = this.page === 0;
    this.rootEl.querySelector('#back-btn').onclick = () => { this.page -= 1; this.render(); };
    this.rootEl.querySelector('#next-btn').onclick = () => this.handleNext();
    this.renderPageBody();
  }

  renderPageBody() {
    const body = this.rootEl.querySelector('#page-body');
    if (this.page <= 2) {
      const key = this.page === 0 ? 'captain' : this.page === 1 ? 'friend1' : 'friend2';
      const c = this.characters[key];
      const quickModes = Object.entries(TEAM_MODES).map(([k,v])=>`<option value='${k}'>${v.label}</option>`).join('');
      body.innerHTML = `<div class='controls'><button id='quick-generate'>Quick Generate</button><select id='team-mode'><option value=''>-- team mode --</option>${quickModes}</select><button id='reset-character'>Reset This Character</button></div>
        <input id='name' placeholder='Name' value='${c.name}'/><input id='species' placeholder='Species' value='${c.species}'/><input id='archetype' placeholder='Archetype' value='${c.archetype}'/>
        ${key==='captain' ? `<select id='commandStyle'><option>Measured</option><option>Aggressive</option><option>Defensive</option><option>Pragmatic</option></select>` : ''}
        <select id='primaryRole'>${ROLE_OPTIONS.map((r)=>`<option ${c.primaryRole===r?'selected':''}>${r}</option>`).join('')}</select>
        <select id='secondaryRole'>${ROLE_OPTIONS.filter((r)=>r!=='Captain').map((r)=>`<option ${c.secondaryRole===r?'selected':''}>${r}</option>`).join('')}</select>
        ${key!=='captain' ? `<input id='wage' type='number' value='${c.wage}'/><select id='relationship'>${RELATIONSHIP_OPTIONS.map((r)=>`<option ${c.relationship===r?'selected':''}>${r}</option>`).join('')}</select>` : ''}
        <textarea id='backstory' placeholder='Backstory'>${c.backstory}</textarea><p id='fit' class='subtext'></p>`;
      if (key === 'captain') body.querySelector('#primaryRole').disabled = true;
      body.querySelector('#quick-generate').onclick = () => { this.quickGenerate(key, body.querySelector('#team-mode').value || null); this.render(); };
      body.querySelector('#reset-character').onclick = () => { this.characters[key] = this.makeCharacter(key); this.render(); };
      ['name','species','archetype','primaryRole','secondaryRole','backstory','wage','relationship','commandStyle'].forEach((id)=>{
        const el = body.querySelector(`#${id}`); if (!el) return; el.oninput = el.onchange = () => { this.characters[key][id] = id==='wage' ? Number(el.value||0) : el.value; this.updateFit(key); };
      });
      this.updateFit(key);
      return;
    }
    body.innerHTML = `<div class='controls'><button id='quick-generate'>Quick Generate</button><button id='reset-character'>Reset This Character</button></div><div id='ship-cards' class='setup-grid'></div>`;
    body.querySelector('#quick-generate').onclick = () => { this.shipId = starterShips[0].id; this.render(); };
    body.querySelector('#reset-character').onclick = () => { this.shipId = null; this.render(); };
    const shipCards = body.querySelector('#ship-cards');
    starterShips.forEach((s) => {
      const d = Object.entries(s.compartments).filter(([,v])=>v.status!=='Operational').map(([k,v])=>`${k}: ${v.status}`).join(', ');
      const b = document.createElement('button'); b.className = `setup-card ${this.shipId===s.id?'selected':''}`;
      b.innerHTML = `<strong>${s.name}</strong><p>${s.hullClass}</p><p>Arlen Federation pre-century hull</p><p>${s.role}</p><p>Crew ${s.minCrew}/${s.optimalCrew}/${s.maxCrew}</p><p>Officer slots ${s.officerSlots} • Fuel ${s.startingFuel}/${s.fuelCapacity} • Cargo ${s.cargoCapacity}</p><p>Quirks: ${s.quirks.join(', ')}</p><p class='subtext'>Damaged/worn: ${d}</p><p class='subtext'>Career fit: ${s.bestCareerFit}</p>`;
      b.onclick = () => { this.shipId = s.id; this.render(); };
      shipCards.appendChild(b);
    });
  }

  updateFit(key) {
    const c = this.characters[key];
    const fit = `Role Fit Preview: ${c.archetype} / ${c.primaryRole} + ${c.secondaryRole}. Strengths: ${this.topAttributes(c).join(', ')}. Weaknesses: ${this.lowAttributes(c).join(', ')}.`;
    const node = this.rootEl.querySelector('#fit'); if (node) node.textContent = fit;
  }
  topAttributes(c){ return Object.entries(c.attributes).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k); }
  lowAttributes(c){ return Object.entries(c.attributes).sort((a,b)=>a[1]-b[1]).slice(0,2).map(([k])=>k); }

  quickGenerate(key, mode) {
    if (key === 'captain') {
      const a = captainArchetypes[Math.floor(Math.random() * captainArchetypes.length)];
      this.characters.captain = { ...this.makeCharacter('captain'), name: 'Captain ' + a.name.split(' ')[0], archetype: a.name, traits: [...a.traits], backstory: a.background, secondaryRole: a.name.includes('Engineer') ? 'Chief Engineer' : 'Navigator' };
      this.quickMode = 'captain-random';
      return;
    }
    if (mode && TEAM_MODES[mode]) {
      const idx = key === 'friend1' ? 0 : 1; const pair = TEAM_MODES[mode].pairs[idx];
      this.characters[key] = { ...this.makeCharacter(key), name: `${key==='friend1'?'Mara':'Ivo'} ${pair.primaryRole.split(' ')[0]}`, primaryRole: pair.primaryRole, secondaryRole: pair.secondaryRole, archetype: `${pair.primaryRole} Specialist` };
      this.quickMode = mode;
    } else {
      const pick = this.candidates[Math.floor(Math.random() * this.candidates.length)];
      this.characters[key] = { ...this.characters[key], name: pick.name, species: pick.species, archetype: pick.archetype, primaryRole: 'Operations Officer', secondaryRole: 'Navigator', traits: [...(pick.traits||[])], backstory: pick.backstory };
    }
    if (this.characters.friend1.primaryRole === this.characters.friend2.primaryRole) this.characters.friend2.primaryRole = 'Chief Engineer';
  }

  computeRoleCoverage(ship) {
    const rec = ['Captain','Pilot','Navigator','Chief Engineer'];
    if (ship.role.includes('survey')) rec.push('Science Officer');
    if (ship.role.includes('patrol')) rec.push('Security Chief');
    if (ship.role.includes('freight')) rec.push('Quartermaster');
    return rec.map((role)=>{
      const all = [this.characters.captain, this.characters.friend1, this.characters.friend2];
      const primary = all.find((c)=>c.primaryRole===role); const secondary = all.find((c)=>c.secondaryRole===role);
      const state = primary ? `Covered by ${primary.name||primary.id}` : secondary ? `Weakly Covered by ${secondary.name||secondary.id} secondary` : 'Missing';
      return `<p>${role}: ${state}</p>`;
    }).join('');
  }

  validatePage() {
    if (this.page <= 2) { const key = this.page===0?'captain':this.page===1?'friend1':'friend2'; return Boolean(this.characters[key].name.trim()); }
    return Boolean(this.shipId);
  }

  handleNext() {
    if (!this.validatePage()) { this.rootEl.querySelector('#setup-warning').textContent = 'Incomplete setup on this page.'; return; }
    this.rootEl.querySelector('#setup-warning').textContent = '';
    if (this.page < 3) { this.page += 1; this.render(); return; }
    this.onStart({ captain: this.characters.captain, friend1: this.characters.friend1, friend2: this.characters.friend2, selectedStarterShipId: this.shipId, quickGenerateMode: this.quickMode });
  }
}
