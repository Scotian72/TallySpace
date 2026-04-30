const speciesPool=['human','mammalian','reptilian','amphibian','avian','rock'];
const templates=[
{name:'Mara Voss',archetype:'Veteran Pilot',rolePreference:'navigation',traits:['Calm','Precise'],attributes:{command:58,navigation:74,engineering:44},wage:210,backstory:'Former convoy pilot with ten years on border routes.'},
{name:'Irix Dhal',archetype:'Dockside Mechanic',rolePreference:'engineering',traits:['Patient','Stubborn'],attributes:{command:42,navigation:46,engineering:76},wage:205,backstory:'Kept freighters moving through three dock strikes.'},
{name:'Pell Knox',archetype:'Salvage Rat',rolePreference:'engineering',traits:['Risky','Resourceful'],attributes:{command:48,navigation:52,engineering:68},wage:188,backstory:'Built a career looting dead lanes for spare mass.'},
{name:'Sera Kade',archetype:'Security Contractor',rolePreference:'command',traits:['Disciplined','Alert'],attributes:{command:69,navigation:47,engineering:43},wage:220,backstory:'Escort specialist from high-risk shipping corridors.'},
{name:'Toma Rell',archetype:'Frontier Medic',rolePreference:'command',traits:['Empathetic','Steady'],attributes:{command:61,navigation:45,engineering:51},wage:190,backstory:'Triaged crews across underfunded fringe stations.'},
{name:'Garn Holt',archetype:'Cargo Boss',rolePreference:'operations',traits:['Practical','Demanding'],attributes:{command:64,navigation:56,engineering:49},wage:200,backstory:'Managed dock labor and loading timings at scale.'},
{name:'Nyx Pavo',archetype:'Rookie Spacer',rolePreference:'navigation',traits:['Eager','Loyal'],attributes:{command:46,navigation:59,engineering:50},wage:140,backstory:'First deep-space posting after academy placement.'},
{name:'Oren Vale',archetype:'Comms Operator',rolePreference:'command',traits:['Connected','Sharp'],attributes:{command:62,navigation:54,engineering:45},wage:185,backstory:'Handled routing and broker chatter for long-haul fleets.'},
{name:'Brakka Stone',archetype:'Systems Tech',rolePreference:'engineering',traits:['Methodical','Quiet'],attributes:{command:50,navigation:48,engineering:71},wage:198,backstory:'Diagnosed reactor and bus faults in remote repair rings.'}
];
export function generateCompanionCandidates(rng,count=5){
  const pool=[...templates]; const out=[];
  for(let i=0;i<count&&pool.length;i+=1){
    const idx=rng.int(0,pool.length-1); const t=pool.splice(idx,1)[0];
    const species=speciesPool[rng.int(0,speciesPool.length-1)];
    out.push({...t,id:`cmp-${i+1}-${t.name.toLowerCase().replace(/\s+/g,'-')}`,species,loyalty:rng.int(48,72),morale:rng.int(52,74),fatigue:rng.int(8,24)});
  }
  return out;
}
