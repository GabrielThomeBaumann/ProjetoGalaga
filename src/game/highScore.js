// Recorde (high score) global: a maior pontuação do ranking no Supabase.
//
// A leitura é pública (a política "ranking publico" permite select para anon),
// então funciona mesmo sem login. A gravação do recorde do jogador é feita
// por scoreService.submitScore(), que exige autenticação.

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

/** Chamada quando uma partida termina. Ainda não salva nada. */
// eslint-disable-next-line no-unused-vars
export function saveHighScore(score) {
  // TODO: chamar submitScore(score) quando o usuário estiver autenticado;
  // se não estiver, guardar em PendingScoreContext e levar ao login/cadastro.
}