// Recorde (high score).
//
// Por enquanto é um valor fixo. Quando o sistema de pontuações existir,
// basta trocar o corpo destas duas funções (localStorage, API, etc.) —
// o resto do jogo já usa só elas.

export const DEFAULT_HIGH_SCORE = 30000;

/** Retorna o recorde salvo. */
export function getHighScore() {
  // TODO: ler do localStorage / backend.
  return DEFAULT_HIGH_SCORE;
}

/** Chamada quando uma partida termina. Ainda não salva nada. */
// eslint-disable-next-line no-unused-vars
export function saveHighScore(score) {
  // TODO: se score > getHighScore(), gravar o novo recorde.
}