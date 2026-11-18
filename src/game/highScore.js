// Recorde (high score) global: a maior pontuação do ranking no Supabase.
//
// A leitura é pública (a política "ranking publico" permite select para anon),
// então funciona mesmo sem login. A gravação é feita por
// scoreService.submitScore(), que exige autenticação (chamada em GamePage).

import { fetchRanking } from '../services/scoreService';

/** Retorna o maior recorde do ranking, ou 0 se não houver nenhum / der erro. */
export async function getHighScore() {
  try {
    const [top] = await fetchRanking(1);
    return top?.best_score ?? 0;
  } catch {
    return 0;
  }
}