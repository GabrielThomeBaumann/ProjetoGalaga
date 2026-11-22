/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Rect & { lives: number, lastShotAt: number, dual: boolean }} Player
 * dual: nave dupla (resgate do Boss) — duas naves lado a lado, dois tiros
 */

/**
 * @typedef {'waiting' | 'entering' | 'settling' | 'formation' | 'diving' | 'beam'} EnemyState
 * waiting   -> na fila, ainda fora da tela (delayMs)
 * entering  -> voando pelo caminho de entrada (ou da coreografia do Challenging Stage)
 * settling  -> encaixando no slot da formação (entrada ou retorno de um mergulho)
 * formation -> no slot (balança e "respira" com a formação)
 * diving    -> mergulho de ataque
 * beam      -> Boss parado emitindo o tractor beam
 */

/**
 * @typedef {Rect & {
 *   active: boolean,
 *   type: 'bee' | 'butterfly' | 'boss',
 *   hp: number,
 *   state: EnemyState,
 *   wave: number,
 *   slotRow: number,
 *   slotCol: number,
 *   hasFormed: boolean,
 *   harmless: boolean,
 *   delayMs: number,
 *   path: object | null,
 *   pathDist: number,
 *   speed: number,
 *   lane: number,
 *   angle: number,
 *   diveKind: string | null,
 *   captive: boolean,
 *   escortOf: object | null
 * }} Enemy
 */

/**
 * @typedef {Rect & { active: boolean, vy: number, vx: number, owner: 'player' | 'enemy' }} Bullet
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
 * @property {object | null} rescue Nave resgatada rodopiando/descendo para se encaixar ao lado do jogador
 * @property {string[]} events Eventos do frame (consumidos por useGame para tocar sons)
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
  return { x, y, width, height, lives, lastShotAt: -Infinity, dual: false };
}

/**
 * @param {{ x: number, y: number, width: number, height: number, type?: string, hp?: number }} params
 * @returns {Enemy}
 */
export function createEnemy({ x, y, width, height, type = 'bee', hp = 1 }) {
  return {
    x,
    y,
    width,
    height,
    active: true,
    type,
    hp,
    state: 'waiting', // o engine decide quando entra em cena
    wave: 0,
    slotRow: 0,
    slotCol: 0,
    hasFormed: false,
    harmless: false,
    delayMs: 0,
    path: null,
    pathDist: 0,
    speed: 0,
    lane: 0,
    angle: 0,
    diveKind: null,
    captive: false,
    escortOf: null,
  };
}

/**
 * @param {{ x: number, y: number, width: number, height: number, vy: number, vx?: number, owner: 'player' | 'enemy' }} params
 * @returns {Bullet}
 */
export function createBullet({ x, y, width, height, vy, vx = 0, owner }) {
  return { x, y, width, height, vy, vx, owner, active: true };
}