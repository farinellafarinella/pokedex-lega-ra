// Regole della Gara Pigliamosche ufficiale. Il server usa lo stesso motore.
export const RULES = {
  pokeballs: 10,
  maxEncounters: 5,
  weightVariation: 0.20,
  minCatch: 0.05,
  maxCatch: 0.95,
  wildLevelOffset: -1,
  throwAnimationMs: 500
};
export const SCORE_RULES = {pointsPerKg: 1.1};

// encounterWeight regola la frequenza; rarityScore è il bonus della giuria.
// base contiene PS, Attacco, Difesa, Att. speciale, Dif. speciale, Velocità.
export const BUG_POKEMON = [
  {"id":"caterpie","name":"Caterpie","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":2.9,"encounterWeight":14,"catchRate":0.65,"base":[45,30,35,20,20,45],"types":["bug"],"moves":["tackle","growl","withdraw","quick"],"image":"bug gif/caterpie.gif"},
  {"id":"ledyba","name":"Ledyba","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":10.8,"encounterWeight":12,"catchRate":0.65,"base":[40,20,30,40,80,55],"types":["bug","flying"],"moves":["tackle","growl","withdraw","quick"],"image":"bug gif/ledyba.gif"},
  {"id":"pinsir","name":"Pinsir","rarity":"Raro","rarityScore":20,"stars":3,"baseWeight":55,"encounterWeight":6,"catchRate":0.38,"base":[65,125,100,55,70,85],"types":["bug"],"moves":["tackle","brick","swords","scary"],"image":"bug gif/pinsir.gif"},
  {"id":"scyther","name":"Scyther","rarity":"Raro","rarityScore":20,"stars":3,"baseWeight":56,"encounterWeight":6,"catchRate":0.38,"base":[70,110,80,55,80,105],"types":["bug","flying"],"moves":["wing","quick","swords","tackle"],"image":"bug gif/scyther.gif"},
  {"id":"venonat","name":"Venonat","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":30,"encounterWeight":10,"catchRate":0.5,"base":[60,55,50,40,55,45],"types":["bug","poison"],"moves":["tackle","poison","sleep","growl"],"image":"bug gif/venonat.gif"},
  {"id":"parasect","name":"Parasect","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":29.5,"encounterWeight":8,"catchRate":0.5,"base":[60,95,80,60,80,30],"types":["bug","grass"],"moves":["scratch","razor","sleep","growl"],"image":"bug gif/parasect.gif"},
  {"id":"spinarak","name":"Spinarak","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":8.5,"encounterWeight":12,"catchRate":0.65,"base":[40,60,40,40,40,30],"types":["bug","poison"],"moves":["tackle","poison","scary","growl"],"image":"bug gif/spinarak.gif"},
  {"id":"kakuna","name":"Kakuna","rarity":"Comune","rarityScore":5,"stars":1,"baseWeight":10,"encounterWeight":12,"catchRate":0.65,"base":[45,25,50,25,25,35],"types":["bug","poison"],"moves":["tackle","withdraw","poison","growl"],"image":"bug gif/kakuna.gif"},
  {"id":"beedrill","name":"Beedrill","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":29.5,"encounterWeight":8,"catchRate":0.5,"base":[65,90,40,45,80,75],"types":["bug","poison"],"moves":["wing","poison","quick","swords"],"image":"bug gif/beedrill.gif"},
  {"id":"butterfree","name":"Butterfree","rarity":"Non comune","rarityScore":10,"stars":2,"baseWeight":32,"encounterWeight":8,"catchRate":0.5,"base":[60,45,50,90,80,70],"types":["bug","flying"],"moves":["wing","tackle","sleep","growl"],"image":"bug gif/butterfree.gif"},
  {"id":"heracross","name":"Heracross","rarity":"Molto raro","rarityScore":30,"stars":4,"baseWeight":54,"encounterWeight":4,"catchRate":0.28,"base":[80,125,75,40,95,85],"types":["bug","fighting"],"moves":["tackle","brick","swords","scary"],"image":"bug gif/heracross.gif"}
];
