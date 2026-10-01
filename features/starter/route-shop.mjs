// Prices and eligibility preserved from the existing shop. Move data comes from ROUTE_MOVE_DB.
export const LEGACY_MOVE_KEYS={
  "thunderbolt": "THUNDERBOLT",
  "quick": "QUICK_ATTACK",
  "thunderwave": "THUNDER_WAVE",
  "growl": "GROWL",
  "vine": "VINE_WHIP",
  "razor": "RAZOR_LEAF",
  "sleep": "SLEEP_POWDER",
  "poison": "POISONPOWDER",
  "tackle": "TACKLE",
  "withdraw": "WITHDRAW",
  "ice": "ICE_BEAM",
  "flame": "FLAMETHROWER",
  "scratch": "SCRATCH",
  "smoke": "SMOKESCREEN",
  "mud": "MUD_SLAP",
  "swords": "SWORDS_DANCE",
  "gun": "WATER_GUN",
  "ancient": "ANCIENTPOWER",
  "bite": "BITE",
  "sludge": "SLUDGE_BOMB",
  "wing": "WING_ATTACK",
  "rock": "ROCK_SLIDE",
  "quake": "EARTHQUAKE",
  "scary": "SCARY_FACE",
  "ember": "EMBER",
  "spark": "SPARK",
  "metal": "METAL_CLAW",
  "recover": "RECOVER",
  "hidden": "HIDDEN_POWER"
};
export const ROUTE_MOVE_SHOP=[
  {
    "id": "razor",
    "price": 180,
    "level": 12,
    "starters": [
      "bulbasaur",
      "chikorita"
    ],
    "description": "Più potenza e probabilità di critico aumentata.",
    "key": "RAZOR_LEAF"
  },
  {
    "id": "poison",
    "price": 160,
    "level": 12,
    "starters": [
      "bulbasaur",
      "chikorita"
    ],
    "description": "Avvelena: danni a ogni fine turno.",
    "key": "POISONPOWDER"
  },
  {
    "id": "sleep",
    "price": 240,
    "level": 13,
    "starters": [
      "bulbasaur",
      "chikorita"
    ],
    "description": "Addormenta per creare spazio a cura o potenziamenti.",
    "key": "SLEEP_POWDER"
  },
  {
    "id": "flame",
    "price": 300,
    "level": 14,
    "starters": [
      "charmander",
      "cyndaquil"
    ],
    "description": "Attacco speciale potente; 10% di scottare.",
    "key": "FLAMETHROWER"
  },
  {
    "id": "smoke",
    "price": 160,
    "level": 12,
    "starters": [
      "charmander",
      "cyndaquil"
    ],
    "description": "Riduce la precisione avversaria.",
    "key": "SMOKESCREEN"
  },
  {
    "id": "ice",
    "price": 300,
    "level": 14,
    "starters": [
      "squirtle",
      "totodile"
    ],
    "description": "Copertura Ghiaccio contro avversari Volante.",
    "key": "ICE_BEAM"
  },
  {
    "id": "bite",
    "price": 160,
    "level": 12,
    "starters": [
      "squirtle",
      "totodile"
    ],
    "description": "Può far tentennare se colpisci per primo.",
    "key": "BITE"
  },
  {
    "id": "thunderbolt",
    "price": 300,
    "level": 14,
    "starters": [
      "pikachu"
    ],
    "description": "Potente attacco speciale Elettro.",
    "key": "THUNDERBOLT"
  },
  {
    "id": "thunderwave",
    "price": 180,
    "level": 12,
    "starters": [
      "pikachu"
    ],
    "description": "Paralizza: riduce la Velocità e può bloccare un turno.",
    "key": "THUNDER_WAVE"
  }
];
