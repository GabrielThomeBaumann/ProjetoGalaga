import {
  WIN_LIFE_BONUS,
  WIN_TIME_BONUS_MAX,
  WIN_TIME_FAST_S,
  WIN_TIME_SLOW_S,
} from './constants';

/**
 * Bônus de uma partida vencida. Quanto menor o tempo, maior o bônus.
 * - Tempo: máximo até WIN_TIME_FAST_S, cai linearmente até zero em WIN_TIME_SLOW_S.
 * - Vidas: WIN_LIFE_BONUS por vida restante.
 */
export function calculateBonus(lives, elapsedMs) {
  const seconds = elapsedMs / 1000;
  const ratio =
    (WIN_TIME_SLOW_S - seconds) / (WIN_TIME_SLOW_S - WIN_TIME_FAST_S);
  const clamped = Math.min(Math.max(ratio, 0), 1);

  const time = Math.round((WIN_TIME_BONUS_MAX * clamped) / 10) * 10;
  const livesBonus = Math.max(lives, 0) * WIN_LIFE_BONUS;

  return { time, lives: livesBonus, total: time + livesBonus };
}

/** Formata milissegundos como "mm:ss". */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}