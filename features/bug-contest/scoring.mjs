import {SCORE_RULES} from './config.mjs?v=official-1';

// Chiamata per la valutazione finale e, prima della scelta, soltanto dal debug.
export function calculateContestScore(pokemon) {
  if (!Number.isFinite(pokemon.weight) || pokemon.weight<=0 || !Number.isFinite(pokemon.rarityScore) || pokemon.rarityScore<0) throw Error('Esemplare non valido.');
  const weightScore = Math.round(pokemon.weight * SCORE_RULES.pointsPerKg);
  const rarityBonus = pokemon.rarityScore;
  return {weightScore, rarityBonus, total:weightScore + rarityBonus};
}
