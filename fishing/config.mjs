// Fishing balance and artwork. Server species and dimensions: database/fishing.sql.
export const RARITIES = {
 common: {label:'Comune', weight:55, catchRate:.58},
 uncommon: {label:'Non Comune', weight:28, catchRate:.44},
 rare: {label:'Raro', weight:13, catchRate:.30},
 veryRare: {label:'Molto Raro', weight:4, catchRate:.19}
};
// Base dimensions are game balancing values, mirrored in database/fishing.sql.
const fish=(name,rarity,base,types=['water'],moves=['gun','tackle','withdraw','growl'],kg=10,metres=.6,asset=null)=>({name,rarity,base,types,moves,kg,metres,weight:1,asset});
export const FISH = {
 magikarp:fish('Magikarp','common',[20,10,55,15,20,80],['water'],['tackle','growl','withdraw','gun'],10,.9),
 goldeen:fish('Goldeen','common',[45,67,60,35,50,63]),
 poliwag:fish('Poliwag','common',[40,50,40,40,40,90]),
 tentacool:fish('Tentacool','common',[40,40,35,50,100,70],['water','poison']),
 krabby:fish('Krabby','common',[30,105,90,25,25,50]),
 horsea:fish('Horsea','uncommon',[30,40,70,70,25,60]),
 shellder:fish('Shellder','uncommon',[30,65,100,45,25,40]),
 staryu:fish('Staryu','uncommon',[30,45,55,70,55,85],['water'],['gun','tackle','recover','withdraw']),
 chinchou:fish('Chinchou','uncommon',[75,38,38,56,56,67],['water','electric'],['gun','spark','tackle','growl']),
 remoraid:fish('Remoraid','uncommon',[35,65,35,65,35,65]),
 corsola:fish('Corsola','rare',[65,55,95,65,95,35],['water','rock'],['gun','ancient','recover','tackle']),
 carvanha:fish('Carvanha','rare',[45,90,20,65,20,65],['water','dark'],['gun','bite','tackle','scary']),
 feebas:fish('Feebas','veryRare',[20,15,20,10,55,80]),
 psyduck:fish('Psyduck','common',[50,52,48,65,50,55],['water'],undefined,20,.8,'../safari/assets/psyduck.png'),
 slowpoke:fish('Slowpoke','rare',[90,65,65,40,40,15],['water','psychic'],undefined,36,1.2,'../safari/assets/slowpoke.png'),
 dratini:fish('Dratini','veryRare',[41,64,45,50,50,50],['dragon'],['tackle','quick','thunderwave','scary'],3,1.8,'../safari/assets/dratini.png')
};
export const RULES={waitMin:1800,waitMax:5200,timingDuration:8500,minCatch:.05,maxCatch:.95,sizeMin:.70,sizeMax:1.70,sizeBands:[[.90,'Piccolo'],[1.10,'Normale'],[1.30,'Grande'],[1.50,'Enorme'],[Infinity,'Record']]};
