const pokemonDB=()=>globalThis.ROUTE_POKEMON_DB||{};
const moveDB=()=>globalThis.ROUTE_MOVE_DB||{};
export const getPokemonById=id=>pokemonDB()[String(Number(id))]||null;
export const getPokemonBySlug=slug=>Object.values(pokemonDB()).find(p=>p.slug.toLowerCase()===String(slug).toLowerCase())||null;
export const getMoveById=key=>moveDB()[key]||null;
export const getPokemonEvolution=id=>(getPokemonById(id)?.evolutions||[]).map(e=>({...e,pokemon:getPokemonById(e.to)}));
export const getPokemonLevelMoves=(id,level=100)=>(getPokemonById(id)?.learnset.levelUp||[]).filter(m=>m.level<=level).map(m=>({...m,data:getMoveById(m.move)}));
export function listPokemon({query='',generation='',type=''}={}){
 const q=query.trim().toLowerCase().replace(/^#/,'');
 return Object.values(pokemonDB()).filter(p=>(!generation||p.generation===Number(generation))&&(!type||p.types.includes(type))&&(!q||p.name.toLowerCase().includes(q)||p.slug.includes(q)||(/^\d+$/.test(q)&&p.id===Number(q)))).sort((a,b)=>a.id-b.id);
}
export const typeNames={normal:'Normale',fire:'Fuoco',water:'Acqua',electric:'Elettro',grass:'Erba',ice:'Ghiaccio',fighting:'Lotta',poison:'Veleno',ground:'Terra',flying:'Volante',psychic:'Psico',bug:'Coleottero',rock:'Roccia',ghost:'Spettro',dragon:'Drago',dark:'Buio',steel:'Acciaio'};
const items={thunderstone:'Pietratuono',water_stone:'Pietraidrica',fire_stone:'Pietrafocaia',leaf_stone:'Pietrafoglia',moon_stone:'Pietralunare',sun_stone:'Pietrasolare',metal_coat:'Metalcoperta',kings_rock:'Roccia di Re',dragon_scale:'Squama Drago',up_grade:'Upgrade'};
export function evolutionMethod(e){
 switch(e.method){
 case 'level':return `Livello ${e.level}`;
 case 'item':return items[e.item]||e.item;
 case 'happiness':return `Felicità ≥ ${e.minFriendship}${e.time==='day'?' · giorno':e.time==='night'?' · notte':''}`;
 case 'trade':return 'Scambio'+(e.heldItem?' con '+(items[e.heldItem]||e.heldItem):'');
 case 'level_stat':return `Livello ${e.level} · ${ {attack_lt_defense:'Attacco < Difesa',attack_gt_defense:'Attacco > Difesa',attack_eq_defense:'Attacco = Difesa'}[e.condition]||e.condition}`;
 default:return e.method;
 }
}
export function evolutionChain(id){
 const all=listPokemon(),parents=new Map();for(const p of all)for(const e of p.evolutions)parents.set(e.to,p.id);
 let root=Number(id);const seen=new Set();while(parents.has(root)&&!seen.has(root)){seen.add(root);root=parents.get(root);}
 const edges=[],visited=new Set();function walk(n){if(visited.has(n))return;visited.add(n);for(const e of getPokemonEvolution(n)){edges.push({from:getPokemonById(n),...e});walk(e.to);}}walk(root);return edges;
}
