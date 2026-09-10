// Regole di produzione condivise dal server e dalla scheda. XP cumulativi.
export const CONFIG={initialLevel:5,maxLevel:50,initialBalance:0};
export const LINES={bulbasaur:['bulbasaur','ivysaur','venusaur'],charmander:['charmander','charmeleon','charizard'],squirtle:['squirtle','wartortle','blastoise']};
export const EVOLUTIONS={
 bulbasaur:{next:'ivysaur',level:16,experience:0,encounters:0},ivysaur:{next:'venusaur',level:32,experience:0,encounters:0},
 charmander:{next:'charmeleon',level:16,experience:0,encounters:0},charmeleon:{next:'charizard',level:36,experience:0,encounters:0},
 squirtle:{next:'wartortle',level:16,experience:0,encounters:0},wartortle:{next:'blastoise',level:36,experience:0,encounters:0}
};
export const DESCRIPTION={bulbasaur:'Un compagno paziente e tenace, pronto a crescere insieme a te.',charmander:'Una piccola fiamma e un grande coraggio per ogni avventura.',squirtle:'Vivace e affidabile, affronta ogni sfida con il suo guscio.'};
export function canEvolve(profile){const rule=EVOLUTIONS[profile.starter.species];return !!rule&&profile.starter.level>=rule.level&&profile.totalXP>=rule.experience&&profile.encounters>=rule.encounters;}
