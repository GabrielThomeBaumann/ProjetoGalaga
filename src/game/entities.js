/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Rect & { lives: number, lastShotAt: number }} Player
 */

/**
 * @typedef {Rect & { 
 *   active: boolean, 
 *   baseX: number, 
 *   phase: number,
 *   state: 'entering' | 'formation',
 *   pathProgress: number,
 *   startX: number,
 *   startY: number,
 *   targetX: number,
 *   targetY: number,
 *   entryType: 'left' | 'right' | 'top'
 * }} Enemy
 */

/**
 * @typedef {Rect & { active: boolean, vy: number, owner: 'player' | 'enemy' }} Bullet
 */

/**
 * @typedef {'playing' | 'paused' | 'won' | 'lost'} GameStatus
 */

/**
 * @typedef {Object} GameState
 * @property {GameStatus} status
 * @property {number} stage
 * @property {boolean} isChallengeStage
 * @property {Player} player
 * @property {Enemy[]} enemies
 * @property {Bullet[]} bullets
 * @property {number} score
 * @property {number} time
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
 * @property {number} stage
 * @property {boolean} isChallengeStage
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
  return { 
    x, 
    y, 
    width, 
    height, 
    active: true, 
    baseX: x, 
    phase: 0,
    state: 'formation', // O engine vai sobrescrever para 'entering' quando spawnar
    pathProgress: 0,
    startX: x,
    startY: y,
    targetX: x,
    targetY: y,
    entryType: 'top'
  };
}

/**
 * @param {{ x: number, y: number, width: number, height: number, vy: number, owner: 'player' | 'enemy' }} params
 * @returns {Bullet}
 */
export function createBullet({ x, y, width, height, vy, owner }) {
  return { x, y, width, height, vy, owner, active: true };
}