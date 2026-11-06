/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Rect & { lives: number, lastShotAt: number }} Player
 * lastShotAt: timestamp (ms) do último tiro.
 */

/**
 * @typedef {Rect & { active: boolean, baseX: number, phase: number }} Enemy
 * baseX: centro do movimento senoidal; phase: defasagem do seno.
 */

/**
 * @typedef {Rect & { active: boolean, vy: number, owner: 'player' | 'enemy' }} Bullet
 * vy em px/s (negativo = sobe).
 */

/**
 * @typedef {'playing' | 'won' | 'lost'} GameStatus
 */

/**
 * @typedef {Object} GameState
 * @property {GameStatus} status
 * @property {Player} player
 * @property {Enemy[]} enemies
 * @property {Bullet[]} bullets
 * @property {number} score
 * @property {number} time  Tempo de jogo em segundos (só avança em 'playing').
 * @property {number} enemyShootTimerMs
 */

/**
 * @typedef {Object} InputState
 * @property {boolean} left
 * @property {boolean} right
 * @property {boolean} shoot
 */

/**
 * @typedef {Object} HudSnapshot
 * @property {number} score
 * @property {number} lives
 * @property {GameStatus} status
 */

/** @returns {InputState} */
export function createInput() {
  return { left: false, right: false, shoot: false };
}

/**
 * @param {{ x: number, y: number, width: number, height: number, lives: number }} params
 * @returns {Player}
 */
export function createPlayer({ x, y, width, height, lives }) {
  return { x, y, width, height, lives, lastShotAt: -Infinity };
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} params
 * @returns {Enemy}
 */
export function createEnemy({ x, y, width, height }) {
  return { x, y, width, height, active: true, baseX: x, phase: 0 };
}

/**
 * @param {{ x: number, y: number, width: number, height: number, vy: number, owner: 'player' | 'enemy' }} params
 * @returns {Bullet}
 */
export function createBullet({ x, y, width, height, vy, owner }) {
  return { x, y, width, height, vy, owner, active: true };
}