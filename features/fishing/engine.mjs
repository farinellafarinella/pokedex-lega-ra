// The fishing minigame generates parameters only. Combat is RouteBattle.BattleEngine.
export function generateFishingEncounter(data,starter){
 return {speciesId:window.RouteEncounters.speciesId(data.species),level:data.level??Math.max(1,starter.level-1),token:data.encounterToken||null};
}
