import {
  BEAM_BOTTOM_HALF_WIDTH,
  BEAM_DURATION_MS,
  BEAM_OPEN_MS,
  BEAM_TOP_HALF_WIDTH,
  BOSS_ATTACK_CHANCE,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHALLENGE_SPEED,
  CHALLENGE_STAGE_FREQUENCY,
  CAPTURE_MAX_ENEMIES,
  CAPTURE_MIN_REDS,
  CHALLENGE_WAVE_OVERLAP,
  COLORS,
  DIVE_BLEND_MS,
  DUAL_GAP,
  DUAL_HITBOX_WIDTH,
  DUAL_WIDTH,
  ENEMY_BULLET_HEIGHT,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_WIDTH,
  ENEMY_HEIGHT,
  ENEMY_TYPES,
  ENEMY_WIDTH,
  ENTRY_SPEED,
  ENTRY_START_DELAY_MS,
  ESCORT_LAG_PX,
  ESCORT_LANE_PX,
  FIRST_DIVE_DELAY_MS,
  FORMATION_BREATH_AMOUNT,
  FORMATION_BREATH_RATE,
  FORMATION_SWAY_AMPLITUDE,
  FORMATION_SWAY_RATE,
  MAX_STAGE,
  PAIR_GAP_MS,
  PAIR_OFFSET,
  PLAYER_BULLET_HEIGHT,
  PLAYER_BULLET_SPEED,
  PLAYER_BULLET_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_HITBOX_HEIGHT,
  PLAYER_HITBOX_WIDTH,
  PLAYER_LIVES,
  PLAYER_SHOOT_COOLDOWN_MS,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y_MARGIN,
  RESCUE_DOCK_S,
  RESCUE_MAX_SPIN_S,
  RESCUE_ONLY_OUTSIDE_FORMATION,
  RESCUE_SCORE,
  RESCUE_SPIN_MIN_S,
  RESCUE_SPIN_RATE,
  SINGLE_GAP_MS,
  WAVE_SETTLE_MS,
} from './constants';
import {
  CHALLENGE_KILL_SCORE,
  CHALLENGE_PATTERNS,
  CHALLENGE_PERFECT_BONUS,
  CHALLENGE_TOTAL,
  CHALLENGE_WAVE_SIZE,
  CHALLENGE_WAVE_BONUS,
  ENTRY_PATTERNS,
  SLOT_TOP,
  WAVE_COMPOSITION,
  buildDiveSegments,
  buildPath,
  cubicPoint,
  getCurve,
  samplePath,
  slotCenter,
} from './choreography';
import { createBullet, createEnemy, createPlayer } from './entities';
import { calculateBonus } from './scoring';
import { getSprite } from './sprites';

/** @typedef {import('./entities').GameState} GameState */
/** @typedef {import('./entities').InputState} InputState */
/** @typedef {import('./entities').HudSnapshot} HudSnapshot */
/** @typedef {import('./entities').Rect} Rect */

/* ----------------------------- Fases ----------------------------- */

/** Challenging Stage: fase especial sem batalha (a cada CHALLENGE_STAGE_FREQUENCY fases). */
function isChallenge(stage) {
  return stage > 1 && stage % CHALLENGE_STAGE_FREQUENCY === 0;
}

/** Quantas fases NORMAIS vieram antes desta (para rotacionar os padrões de entrada). */
function normalStageIndex(stage) {
  return stage - 1 - Math.floor((stage - 1) / CHALLENGE_STAGE_FREQUENCY);
}

/* ----------------------------- Criação ----------------------------- */

/**
 * Plano de lançamento de uma onda de `count` inimigos.
 *  'single' -> UMA coluna (fila indiana) com todos os inimigos
 *  'split'  -> DUAS colunas espelhadas saindo juntas, cada uma com metade
 *  'pair'   -> pares lado a lado (não usado nos padrões atuais)
 */
function planWave(def, count, startMs) {
  const base = !!def.mirror;
  const plan = [];
  for (let i = 0; i < count; i++) {
    const pairIndex = Math.floor(i / 2);
    const second = i % 2 === 1;
    if (def.mode === 'single') {
      plan.push({
        curve: def.curve,
        mirror: base,
        lane: 0,
        delayMs: startMs + i * SINGLE_GAP_MS,
      });
    } else if (def.mode === 'pair') {
      plan.push({
        curve: def.curve,
        mirror: base,
        lane: second ? 1 : -1,
        delayMs: startMs + pairIndex * PAIR_GAP_MS,
      });
    } else {
      // 'split': 2 colunas ao mesmo tempo; a 1ª metade da lista numa, a 2ª na outra.
      const half = count / 2;
      const col = i < half ? 0 : 1;
      plan.push({
        curve: def.curve,
        mirror: col === 1 ? !base : base,
        lane: 0,
        delayMs: startMs + (i % half) * SINGLE_GAP_MS,
      });
    }
  }
  return plan;
}

/** Tempo (ms) que a onda leva do 1º lançamento até `fraction` do caminho do último inimigo. */
function waveSpanMs(def, count, speed, fraction) {
  const total = getCurve(def.curve, !!def.mirror).total;
  const perColumn = def.mode === 'split' ? count / 2 : count;
  return (perColumn - 1) * SINGLE_GAP_MS + ((total * fraction) / speed) * 1000;
}

function makeEnemy({ type, wave, row = 0, col = 0, plan, speed, harmless }) {
  const enemy = createEnemy({
    x: -1000,
    y: -1000,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    type,
    hp: ENEMY_TYPES[type].hp,
  });
  enemy.state = 'waiting';
  enemy.wave = wave;
  enemy.slotRow = row;
  enemy.slotCol = col;
  enemy.delayMs = plan.delayMs;
  enemy.path = getCurve(plan.curve, plan.mirror);
  enemy.lane = plan.lane * PAIR_OFFSET;
  enemy.speed = speed;
  enemy.harmless = harmless;
  return enemy;
}

/** 40 inimigos em 5 ondas de 8 (4 bosses, 16 borboletas, 20 abelhas), uma onda por vez. */
function createEntryEnemies(stage) {
  const pattern = ENTRY_PATTERNS[normalStageIndex(stage) % ENTRY_PATTERNS.length];
  const enemies = [];
  let start = ENTRY_START_DELAY_MS;

  WAVE_COMPOSITION.forEach((groups, wave) => {
    const slots = groups.flatMap((g) =>
      g.cols.map((col) => ({ type: g.type, row: g.row, col })),
    );
    const plan = planWave(pattern[wave], slots.length, start);
    // A próxima onda só sai depois que esta terminou de entrar (uma fila por vez).
    start += waveSpanMs(pattern[wave], slots.length, ENTRY_SPEED, 1) + WAVE_SETTLE_MS;
    slots.forEach((slot, i) => {
      enemies.push(
        makeEnemy({
          type: slot.type,
          wave,
          row: slot.row,
          col: slot.col,
          plan: plan[i],
          speed: ENTRY_SPEED,
          harmless: false,
        }),
      );
    });
  });
  return enemies;
}

/**
 * Challenging Stage: 5 grupos de 8 (36 comuns + 4 Bosses na onda 2). Voam pela
 * coreografia e saem da tela — sem formação, sem tiros.
 */
function createChallengeEnemies(stage) {
  const index = Math.floor(stage / CHALLENGE_STAGE_FREQUENCY) - 1;
  const pattern = CHALLENGE_PATTERNS[index % CHALLENGE_PATTERNS.length];
  const enemies = [];
  let start = ENTRY_START_DELAY_MS;

  pattern.waves.forEach((def, wave) => {
    const types =
      wave === 1
        ? ['boss', 'boss', 'boss', 'boss', pattern.kind, pattern.kind, pattern.kind, pattern.kind]
        : Array(CHALLENGE_WAVE_SIZE).fill(pattern.kind);
    const plan = planWave(def, CHALLENGE_WAVE_SIZE, start);
    start += waveSpanMs(def, CHALLENGE_WAVE_SIZE, CHALLENGE_SPEED, CHALLENGE_WAVE_OVERLAP);
    types.forEach((type, i) => {
      enemies.push(
        makeEnemy({ type, wave, plan: plan[i], speed: CHALLENGE_SPEED, harmless: true }),
      );
    });
  });
  return enemies;
}

/** Prepara tudo que é "por fase" (inimigos, formação, relógio de mergulhos). */
function startStage(state) {
  state.isChallengeStage = isChallenge(state.stage);
  state.time = 0;
  state.enemies = state.isChallengeStage
    ? createChallengeEnemies(state.stage)
    : createEntryEnemies(state.stage);
  state.formationComplete = false;
  state.formationDx = 0;
  state.breathT = 0;
  state.breath = 1;
  state.diveTimerMs = FIRST_DIVE_DELAY_MS;
  state.challenge = state.isChallengeStage
    ? {
        waveKills: [0, 0, 0, 0, 0],
        hits: 0,
        resolved: false,
        resultTimerMs: 0,
        waveBonus: 0,
        perfect: false,
      }
    : null;
}

/** @returns {GameState} */
export function createInitialState(stage = 1) {
  const state = {
    status: 'playing',
    stage,
    isChallengeStage: false,
    player: createPlayer({
      x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - PLAYER_Y_MARGIN,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      lives: PLAYER_LIVES,
    }),
    enemies: [],
    bullets: [],
    score: 0,
    time: 0, // tempo da fase atual (zera a cada fase)
    elapsedMs: 0, // tempo total da partida (não zera entre fases)
    // Fila de eventos do frame (sons). O som de início só vale para a fase 1.
    events: stage === 1 ? ['gameStart'] : [],
    rescue: null,
    lostCaptive: null,
  };
  startStage(state);
  return state;
}

/* ----------------------------- Utilidades ----------------------------- */

export function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPlayerHitbox(player) {
  const width = player.dual ? DUAL_HITBOX_WIDTH : PLAYER_HITBOX_WIDTH;
  return {
    x: player.x + (player.width - width) / 2,
    y: player.y + (player.height - PLAYER_HITBOX_HEIGHT) / 2,
    width,
    height: PLAYER_HITBOX_HEIGHT,
  };
}

/** Desfaz a nave dupla (uma das naves se perde); a nave que fica é a da esquerda. */
function breakDual(player) {
  player.dual = false;
  player.width = PLAYER_WIDTH;
}

/** Acerto no jogador: com nave dupla perde-se uma nave (o upgrade); sem ela, uma vida. */
function damagePlayer(player) {
  if (player.dual) breakDual(player);
  else player.lives -= 1;
}

export function toHudSnapshot(state) {
  // O bônus só vale na vitória.
  const won = state.status === 'won';
  const bonus = won
    ? calculateBonus(state.player.lives, state.elapsedMs)
    : { time: 0, lives: 0, total: 0 };

  return {
    score: state.score,
    lives: state.player.lives,
    status: state.status,
    stage: state.stage,
    isChallengeStage: state.isChallengeStage,
    elapsedMs: state.elapsedMs,
    timeBonus: bonus.time,
    lifeBonus: bonus.lives,
    finalScore: state.score + bonus.total,
  };
}

const centerX = (e) => e.x + e.width / 2;
const centerY = (e) => e.y + e.height / 2;

function setCenter(e, x, y) {
  e.x = x - e.width / 2;
  e.y = y - e.height / 2;
}

/** Gira `angle` em direção a `target` pelo caminho mais curto. */
function turnToward(angle, target, amount) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return angle + diff * Math.min(1, amount);
}

/** Ângulo de desenho para uma direção (o sprite "olha" para baixo quando parado). */
const headingOf = (dx, dy) => Math.atan2(-dx, dy);

/* ----------------------------- Update ----------------------------- */

export function update(state, input, dtMs, nowMs, random = Math.random) {
  if (state.status !== 'playing') return state;

  const dt = dtMs / 1000;
  state.time += dt;
  state.elapsedMs += dtMs;

  updatePlayer(state, input, dt, nowMs);
  updateFormation(state, dt);
  updateEnemies(state, dt, dtMs);
  updateTractorBeams(state);
  updateRescue(state, dt);
  if (state.lostCaptive) {
    state.lostCaptive.t += dt;
    if (state.lostCaptive.t > 1) state.lostCaptive = null;
  }

  if (!state.isChallengeStage) {
    updateDiveScheduler(state, dtMs, random);
  }

  updateBullets(state, dt);
  resolveCollisions(state);
  cleanup(state);
  updateStatus(state, dtMs);

  return state;
}

function updatePlayer(state, input, dt, nowMs) {
  const { player } = state;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.x = clamp(
    player.x + direction * PLAYER_SPEED * dt,
    0,
    CANVAS_WIDTH - player.width,
  );

  if (input.shoot && nowMs - player.lastShotAt >= PLAYER_SHOOT_COOLDOWN_MS) {
    player.lastShotAt = nowMs;
    // Nave dupla: um tiro saindo de cada nave, ao mesmo tempo.
    const shipsX = player.dual
      ? [player.x, player.x + PLAYER_WIDTH + DUAL_GAP]
      : [player.x];
    for (const shipX of shipsX) {
      state.bullets.push(
        createBullet({
          x: shipX + (PLAYER_WIDTH - PLAYER_BULLET_WIDTH) / 2,
          y: player.y - PLAYER_BULLET_HEIGHT,
          width: PLAYER_BULLET_WIDTH,
          height: PLAYER_BULLET_HEIGHT,
          vy: -PLAYER_BULLET_SPEED,
          owner: 'player',
        }),
      );
    }
  }
}

/* --- Formação: balança em bloco e "respira" (como no arcade; não desce) --- */

function updateFormation(state, dt) {
  state.formationDx =
    Math.sin(state.time * FORMATION_SWAY_RATE) * FORMATION_SWAY_AMPLITUDE;

  // A respiração só começa quando todos estão formados (fase de ataque).
  if (state.formationComplete) state.breathT += dt;
  state.breath =
    1 +
    FORMATION_BREATH_AMOUNT * (0.5 - 0.5 * Math.cos(state.breathT * FORMATION_BREATH_RATE));
}

/** Centro atual do slot do inimigo (com balanço e respiração). */
function slotPosition(state, enemy) {
  const base = slotCenter(enemy.slotRow, enemy.slotCol);
  const b = state.breath;
  return {
    x: CANVAS_WIDTH / 2 + (base.x - CANVAS_WIDTH / 2) * b + state.formationDx,
    y: SLOT_TOP + (base.y - SLOT_TOP) * (1 + (b - 1) * 0.6),
  };
}

/* --- Movimento dos inimigos (máquina de estados) --- */

const tmp = { x: 0, y: 0, tx: 0, ty: 1 };

/** Posiciona o inimigo no caminho, com deslocamento lateral (pares / escoltas). */
function placeOnPath(enemy, dist) {
  samplePath(enemy.path, dist, tmp);
  const x = tmp.x - tmp.ty * enemy.lane;
  const y = tmp.y + tmp.tx * enemy.lane;
  setCenter(enemy, x, y);
  return tmp;
}

/** Começa a encaixar no slot a partir de (fromX, fromY) saindo na direção (tx, ty). */
function beginSettle(enemy, fromX, fromY, tx, ty) {
  enemy.state = 'settling';
  enemy.settleFrom = { x: fromX, y: fromY, tx, ty };
  enemy.settleT = 0;
  enemy.lane = 0;
  enemy.skipHeading = true;
  enemy.angle = headingOf(tx, ty);
}

function updateEnemies(state, dt, dtMs) {
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    const prevX = enemy.x;
    const prevY = enemy.y;
    let targetAngle = null;

    switch (enemy.state) {
      case 'waiting': {
        enemy.delayMs -= dtMs;
        if (enemy.delayMs <= 0) {
          enemy.state = 'entering';
          enemy.pathDist = 0;
          const t = placeOnPath(enemy, 0);
          enemy.angle = headingOf(t.tx, t.ty);
          enemy.skipHeading = true;
        }
        break;
      }

      case 'entering': {
        enemy.pathDist += enemy.speed * dt;
        if (enemy.pathDist >= enemy.path.total) {
          if (state.isChallengeStage) {
            // Challenging Stage: saiu da tela, sem formação.
            enemy.active = false;
            break;
          }
          const t = placeOnPath(enemy, enemy.path.total);
          beginSettle(enemy, centerX(enemy), centerY(enemy), t.tx, t.ty);
        } else {
          placeOnPath(enemy, enemy.pathDist);
        }
        break;
      }

      case 'settling': {
        const target = slotPosition(state, enemy);
        const from = enemy.settleFrom;
        const len = Math.hypot(target.x - from.x, target.y - from.y);
        const duration = Math.max(0.28, (len / (ENTRY_SPEED * 0.85)));
        enemy.settleT += dt / duration;
        const u = Math.min(enemy.settleT, 1);
        const c1 = { x: from.x + from.tx * len * 0.45, y: from.y + from.ty * len * 0.45 };
        const c2 = {
          x: from.x + (target.x - from.x) * 0.8,
          y: from.y + (target.y - from.y) * 0.8,
        };
        const [px, py] = cubicPoint(
          [from.x, from.y],
          [c1.x, c1.y],
          [c2.x, c2.y],
          [target.x, target.y],
          u,
        );
        setCenter(enemy, px, py);
        if (u >= 1) {
          enemy.state = 'formation';
          enemy.hasFormed = true;
        }
        break;
      }

      case 'formation': {
        const c = slotPosition(state, enemy);
        setCenter(enemy, c.x, c.y);
        enemy.hasFormed = true;
        targetAngle = 0;
        break;
      }

      case 'diving':
        updateDiver(state, enemy, dt, dtMs);
        break;

      case 'beam': {
        enemy.beamMs += dtMs;
        targetAngle = 0;
        if (enemy.beamMs >= BEAM_DURATION_MS) endBeam(state, enemy);
        break;
      }

      default:
        break;
    }

    if (!enemy.active) continue;

    // Orientação: aponta para onde está indo; na formação volta a olhar para baixo.
    if (enemy.skipHeading) {
      enemy.skipHeading = false;
    } else if (targetAngle !== null) {
      enemy.angle = turnToward(enemy.angle, targetAngle, dt * 14);
    } else {
      const mx = enemy.x - prevX;
      const my = enemy.y - prevY;
      if (Math.hypot(mx, my) > 0.05) {
        enemy.angle = turnToward(enemy.angle, headingOf(mx, my), dt * 18);
      }
    }
  }
}

/* --- Mergulhos --- */

function maxDivers(stage) {
  // Mais inimigos atacando ao mesmo tempo conforme a fase avança (aprox., até 6).
  return Math.min(6, 2 + Math.floor((stage - 1) / 3));
}

function diveInterval(stage) {
  return Math.max(650, 1700 - (stage - 1) * 90);
}

const isAttacking = (e) => e.state === 'diving' || e.state === 'beam';

function updateDiveScheduler(state, dtMs, random) {
  if (!state.formationComplete) {
    // Os mergulhos só começam depois que TODOS entraram na formação (como no arcade).
    if (state.enemies.every((e) => e.hasFormed)) {
      state.formationComplete = true;
      state.diveTimerMs = FIRST_DIVE_DELAY_MS;
    }
    return;
  }

  // Durante o resgate ninguém começa um novo ataque: os que estão no ar terminam e voltam.
  if (state.rescue) return;

  state.diveTimerMs -= dtMs;
  if (state.diveTimerMs > 0) return;

  const divers = state.enemies.filter((e) => e.active && isAttacking(e)).length;
  if (divers >= maxDivers(state.stage)) {
    state.diveTimerMs = 250;
    return;
  }

  launchAttack(state, random);
  state.diveTimerMs = diveInterval(state.stage) * (0.6 + random() * 0.8);
}

function launchAttack(state, random) {
  const inFormation = state.enemies.filter((e) => e.active && e.state === 'formation');
  if (inFormation.length === 0) return;

  const { player } = state;
  const targetX = player.x + player.width / 2;
  const bosses = inFormation.filter((e) => e.type === 'boss');
  const others = inFormation.filter((e) => e.type !== 'boss');

  const captureReady =
    bosses.length > 0 &&
    (player.dual || player.lives > 1) &&
    state.enemies.filter((e) => e.active).length <= CAPTURE_MAX_ENEMIES &&
    state.enemies.filter((e) => e.active && e.type === 'butterfly').length >= CAPTURE_MIN_REDS &&
    !state.enemies.some((e) => e.active && (e.captive || e.diveKind === 'capture'));
  // O Boss que leva a nave capturada é o próximo a atacar: é a chance de resgatá-la.
  const captor = bosses.find((b) => b.captive);
  const bossTurn =
    bosses.length > 0 &&
    (captor || others.length === 0 || captureReady || random() < BOSS_ATTACK_CHANCE);
  if (bossTurn) {
    const boss = captor ?? bosses[Math.floor(random() * bosses.length)];

    // TRACTOR BEAM: não é sorteio. Só acontece com poucos inimigos vivos E pelo menos
    // 2 inimigos vermelhos (borboletas) ainda vivos; nesse caso o Boss desce sozinho e abre o feixe.
    const alive = state.enemies.filter((e) => e.active);
    const reds = alive.filter((e) => e.type === 'butterfly').length;
    const someoneCaptive = alive.some((e) => e.captive);
    const someoneCapturing = alive.some((e) => e.diveKind === 'capture');
    if (
      (player.dual || player.lives > 1) &&
      !someoneCaptive &&
      !someoneCapturing &&
      alive.length <= CAPTURE_MAX_ENEMIES &&
      reds >= CAPTURE_MIN_REDS
    ) {
      startDive(boss, 'capture', targetX);
      return;
    }

    // Boss + até 2 borboletas de escolta (mais pontos se acertar com as escoltas vivas).
    startDive(boss, 'boss', targetX);
    const escorts = others
      .filter((e) => e.type === 'butterfly')
      .map((e) => ({ e, d: Math.hypot(e.x - boss.x, e.y - boss.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map((o) => o.e);
    escorts.forEach((escort, k) => {
      startDive(escort, 'boss', targetX, {
        leader: boss,
        lane: k === 0 ? -ESCORT_LANE_PX : ESCORT_LANE_PX,
        lag: ESCORT_LAG_PX * (k + 1),
      });
    });
    return;
  }

  const pick = others[Math.floor(random() * others.length)];
  startDive(pick, pick.type, targetX);
}

/**
 * kind: 'bee' (laço) | 'butterfly' (zigue-zague) | 'boss' | 'capture' | 'exit'.
 * Com `follow`, o inimigo segue o caminho do líder (escolta do Boss).
 */
function startDive(enemy, kind, targetX, follow = null) {
  const cx = centerX(enemy);
  const cy = centerY(enemy);

  enemy.state = 'diving';
  enemy.diveKind = kind;
  enemy.launchX = cx;
  enemy.launchY = cy;
  enemy.blendMs = 0;
  enemy.markIdx = 0;

  if (follow) {
    enemy.path = follow.leader.path;
    enemy.lane = follow.lane;
    enemy.pathDist = -follow.lag;
    enemy.escortOf = follow.leader;
    enemy.diveSpeed = ENEMY_TYPES.boss.diveSpeed;
  } else {
    // Abre para o lado de fora da formação e depois fecha sobre o jogador.
    const dir = cx < CANVAS_WIDTH / 2 ? -1 : 1;
    enemy.path = buildPath(buildDiveSegments(kind, { x0: cx, y0: cy, dir, tx: targetX }));
    enemy.lane = 0;
    enemy.pathDist = 0;
    enemy.escortOf = null;
    enemy.diveSpeed = ENEMY_TYPES[enemy.type].diveSpeed;
  }
}

function updateDiver(state, enemy, dt, dtMs) {
  enemy.pathDist += enemy.diveSpeed * dt;
  enemy.blendMs += dtMs;

  const dist = Math.max(enemy.pathDist, 0);
  samplePath(enemy.path, dist, tmp);
  let x = tmp.x - tmp.ty * enemy.lane;
  let y = tmp.y + tmp.tx * enemy.lane;

  // Escolta: sai do slot e "emboca" no caminho do Boss suavemente.
  if (enemy.blendMs < DIVE_BLEND_MS) {
    const b = enemy.blendMs / DIVE_BLEND_MS;
    const s = b * b * (3 - 2 * b);
    x = enemy.launchX + (x - enemy.launchX) * s;
    y = enemy.launchY + (y - enemy.launchY) * s;
  }
  setCenter(enemy, x, y);

  // Tiros dos mergulhadores (mirados no jogador).
  if (enemy.diveKind !== 'capture' && enemy.diveKind !== 'exit') {
    const marks = ENEMY_TYPES[enemy.type].fireMarks;
    const progress = enemy.pathDist / enemy.path.total;
    while (enemy.markIdx < marks.length && progress >= marks[enemy.markIdx]) {
      enemy.markIdx += 1;
      fireAimedBullet(state, enemy);
    }
  }

  if (enemy.pathDist >= enemy.path.total) endDive(state, enemy);
}

function fireAimedBullet(state, shooter) {
  const { player } = state;
  const sx = centerX(shooter);
  const sy = shooter.y + shooter.height;
  const dx = centerX(player) - sx;
  const dy = player.y - sy;
  if (dy < 80) return; // já passou do jogador
  const len = Math.hypot(dx, dy);
  state.bullets.push(
    createBullet({
      x: sx - ENEMY_BULLET_WIDTH / 2,
      y: sy,
      width: ENEMY_BULLET_WIDTH,
      height: ENEMY_BULLET_HEIGHT,
      vx: (dx / len) * ENEMY_BULLET_SPEED,
      vy: (dy / len) * ENEMY_BULLET_SPEED,
      owner: 'enemy',
    }),
  );
}

function endDive(state, enemy) {
  if (enemy.diveKind === 'capture') {
    // Chegou sobre o jogador: abre o tractor beam.
    enemy.state = 'beam';
    enemy.beamMs = 0;
    return;
  }
  // Saiu por baixo: reaparece no topo e volta para o slot.
  enemy.diveKind = null;
  enemy.escortOf = null;
  const c = slotPosition(state, enemy);
  setCenter(enemy, c.x, -ENEMY_HEIGHT);
  beginSettle(enemy, c.x, -ENEMY_HEIGHT, 0, 1);
}

/* --- Tractor beam do Boss Galaga (captura simplificada) --- */

function beamHalfWidthAt(boss, y) {
  const top = boss.y + boss.height;
  const bottom = CANVAS_HEIGHT;
  const t = clamp((y - top) / (bottom - top), 0, 1);
  return BEAM_TOP_HALF_WIDTH + (BEAM_BOTTOM_HALF_WIDTH - BEAM_TOP_HALF_WIDTH) * t;
}

function updateTractorBeams(state) {
  const { player } = state;
  const hitbox = getPlayerHitbox(player);

  for (const boss of state.enemies) {
    if (!boss.active || boss.state !== 'beam' || boss.captive) continue;
    if (boss.beamMs < BEAM_OPEN_MS) continue;

    const bx = centerX(boss);
    const half = beamHalfWidthAt(boss, hitbox.y);
    const inside =
      hitbox.y > boss.y + boss.height &&
      hitbox.x < bx + half &&
      hitbox.x + hitbox.width > bx - half;

    // Não captura a última vida: o Boss só leva uma nave se sobrar outra para jogar.
    if (inside && (player.dual || player.lives > 1)) {
      // Captura: o Boss leva uma nave (1 vida; com nave dupla, leva só a segunda nave).
      damagePlayer(player);
      boss.captive = true;
      boss.beamMs = Math.max(boss.beamMs, BEAM_DURATION_MS - 500);
    }
  }
}

function endBeam(state, boss) {
  if (boss.captive) {
    // Sobe com a nave capturada de volta para a formação.
    beginSettle(boss, centerX(boss), centerY(boss), 0, -1);
    boss.diveKind = null;
    return;
  }
  // Sem captura: foge por baixo e depois volta pelo topo.
  startDive(boss, 'exit', centerX(boss));
}

/* --- Resgate: a nave solta rodopia e depois vira a nave dupla --- */

function updateRescue(state, dt) {
  const r = state.rescue;
  if (!r) return;
  const { player } = state;
  r.t += dt;

  if (r.phase === 'spinning') {
    // Rodopia no ar até passar um tempo mínimo E todos os inimigos voltarem à formação.
    r.angle += RESCUE_SPIN_RATE * dt;
    const calm = state.enemies.every((e) => e.state === 'formation');
    if ((r.t >= RESCUE_SPIN_MIN_S && calm) || r.t >= RESCUE_MAX_SPIN_S) {
      r.phase = 'docking';
      r.dockT = 0;
      r.fromX = r.x;
      r.fromY = r.y;
      r.fromAngle = r.angle;
      r.endAngle = Math.ceil(r.angle / (Math.PI * 2)) * Math.PI * 2; // termina "em pé"
      r.side = player.x + player.width + DUAL_GAP + PLAYER_WIDTH <= CANVAS_WIDTH ? 1 : -1;
    }
    return;
  }

  // Desce e se encaixa ao lado da nave do jogador (acompanha o jogador enquanto desce).
  r.dockT += dt / RESCUE_DOCK_S;
  const u = Math.min(r.dockT, 1);
  const ease = u * u * (3 - 2 * u);
  const tx = clamp(
    centerX(player) + (PLAYER_WIDTH + DUAL_GAP) * r.side,
    PLAYER_WIDTH / 2,
    CANVAS_WIDTH - PLAYER_WIDTH / 2,
  );
  const ty = centerY(player);
  r.x = r.fromX + (tx - r.fromX) * ease;
  r.y = r.fromY + (ty - r.fromY) * ease;
  r.angle = r.fromAngle + (r.endAngle - r.fromAngle) * ease;

  if (r.dockT >= 1) {
    if (r.side === -1) player.x -= PLAYER_WIDTH + DUAL_GAP; // a nova nave fica à esquerda
    player.dual = true;
    player.width = DUAL_WIDTH;
    player.x = clamp(player.x, 0, CANVAS_WIDTH - DUAL_WIDTH);
    state.rescue = null;
    state.diveTimerMs = FIRST_DIVE_DELAY_MS; // respiro antes dos próximos ataques
  }
}

/* ----------------------------- Tiros, colisão e status ----------------------------- */

function updateBullets(state, dt) {
  for (const bullet of state.bullets) {
    bullet.y += bullet.vy * dt;
    bullet.x += (bullet.vx ?? 0) * dt;
    if (
      bullet.y + bullet.height < 0 ||
      bullet.y > CANVAS_HEIGHT ||
      bullet.x + bullet.width < 0 ||
      bullet.x > CANVAS_WIDTH
    ) {
      bullet.active = false;
    }
  }
}

/** Aplica 1 tiro no inimigo: Boss leva 2; pontuação varia por tipo e situação. */
function hitEnemy(state, enemy) {
  enemy.hp -= 1;
  if (enemy.hp > 0) return; // Boss: muda de cor no primeiro tiro

  enemy.active = false;
  state.events.push('enemyKill');

  if (state.isChallengeStage) {
    state.score += CHALLENGE_KILL_SCORE;
    state.challenge.hits += 1;
    state.challenge.waveKills[enemy.wave] += 1;
    return;
  }

  const cfg = ENEMY_TYPES[enemy.type];
  const attacking = isAttacking(enemy);
  let points = attacking ? cfg.scoreDive : cfg.scoreFormation;

  if (enemy.type === 'boss' && attacking && enemy.diveKind !== 'capture') {
    const escorts = state.enemies.filter((o) => o.active && o.escortOf === enemy).length;
    points = escorts >= 2 ? 1600 : escorts === 1 ? 800 : 400;
  }
  state.score += points;

  if (enemy.type === 'boss' && enemy.captive) {
    if (!RESCUE_ONLY_OUTSIDE_FORMATION || enemy.state !== 'formation') {
      releaseCaptive(state, enemy);
    } else {
      // Abatido na formação: a nave capturada se perde (como no arcade). Mostra um efeito.
      state.lostCaptive = { x: centerX(enemy), y: centerY(enemy) - enemy.height, t: 0 };
    }
  }
}

/**
 * RESGATE: abater o Boss que leva a nave solta a nave, que rodopia no ar até tudo se
 * acalmar e depois se encaixa ao lado do jogador (nave dupla).
 */
function releaseCaptive(state, boss) {
  state.score += RESCUE_SCORE;
  state.rescue = {
    phase: 'spinning',
    x: clamp(centerX(boss), 24, CANVAS_WIDTH - 24), // sempre visível na tela
    y: clamp(centerY(boss), 60, state.player.y - 120),
    angle: 0,
    t: 0,
  };
}

function resolveCollisions(state) {
  const { player } = state;

  for (const bullet of state.bullets) {
    if (!bullet.active) continue;

    if (bullet.owner === 'player') {
      for (const enemy of state.enemies) {
        if (enemy.active && intersects(bullet, enemy)) {
          bullet.active = false;
          hitEnemy(state, enemy);
          break;
        }
      }
    } else if (intersects(bullet, getPlayerHitbox(player))) {
      bullet.active = false;
      damagePlayer(player);
    }
  }

  for (const enemy of state.enemies) {
    // No Challenging Stage os inimigos são inofensivos (passam rente à nave).
    if (enemy.active && !enemy.harmless && intersects(enemy, getPlayerHitbox(player))) {
      enemy.active = false;
      if (enemy.type === 'boss' && enemy.captive) releaseCaptive(state, enemy);
      damagePlayer(player);
    }
  }

  player.lives = Math.max(player.lives, 0);
}

function cleanup(state) {
  state.bullets = state.bullets.filter((b) => b.active);
  state.enemies = state.enemies.filter((e) => e.active);
}

function resolveChallengeBonus(state) {
  const ch = state.challenge;
  const index = Math.floor(state.stage / CHALLENGE_STAGE_FREQUENCY) - 1;
  const perWave =
    CHALLENGE_WAVE_BONUS[Math.min(index, CHALLENGE_WAVE_BONUS.length - 1)];

  // Bônus por onda inteira abatida (8 de 8) e bônus de 10.000 se acertar os 40.
  const clearedWaves = ch.waveKills.filter((k) => k >= CHALLENGE_WAVE_SIZE).length;
  ch.waveBonus = clearedWaves * perWave;
  ch.perfect = ch.hits >= CHALLENGE_TOTAL;
  state.score += ch.waveBonus + (ch.perfect ? CHALLENGE_PERFECT_BONUS : 0);
  ch.resolved = true;
  ch.resultTimerMs = 3500;
}

function advanceStage(state) {
  if (state.stage + 1 > MAX_STAGE) {
    state.status = 'won';
    return;
  }
  state.stage += 1;
  startStage(state);
}

function updateStatus(state, dtMs) {
  if (state.player.lives <= 0) {
    state.status = 'lost';
    state.events.push('death'); // só quando perde de fato
    return;
  }

  if (state.enemies.length > 0) return;
  if (state.rescue) return; // espera a nave resgatada se encaixar

  if (state.isChallengeStage) {
    // Mostra o resultado (acertos / bônus) antes de seguir para a próxima fase.
    if (!state.challenge.resolved) {
      resolveChallengeBonus(state);
      return;
    }
    state.challenge.resultTimerMs -= dtMs;
    if (state.challenge.resultTimerMs > 0) return;
  }

  advanceStage(state);
}

/* ----------------------------- Render ----------------------------- */

// Cache de sprites tingidos por tipo (a mesma imagem base serve para os 3 inimigos).
const tintCache = new Map();

function getTinted(sprite, key, color) {
  let entry = tintCache.get(key);
  if (!entry || entry.src !== sprite) {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.naturalWidth || sprite.width;
    canvas.height = sprite.naturalHeight || sprite.height;
    const c = canvas.getContext('2d');
    c.drawImage(sprite, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = 0.55;
    c.fillStyle = color;
    c.fillRect(0, 0, canvas.width, canvas.height);
    entry = { src: sprite, canvas };
    tintCache.set(key, entry);
  }
  return entry.canvas;
}

function enemyColor(enemy) {
  const cfg = ENEMY_TYPES[enemy.type];
  return enemy.type === 'boss' && enemy.hp < cfg.hp ? cfg.hitColor : cfg.color;
}

/** Desenha uma nave do jogador com o canto superior esquerdo em (x, y). */
function drawShip(ctx, x, y) {
  const sprite = getSprite('player');
  if (sprite) {
    ctx.drawImage(sprite, x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
  } else {
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_WIDTH / 2, y);
    ctx.lineTo(x + PLAYER_WIDTH, y + PLAYER_HEIGHT);
    ctx.lineTo(x, y + PLAYER_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBeam(ctx, boss, player) {
  const top = boss.y + boss.height;
  const bottom = player.y + player.height;
  const open = clamp(boss.beamMs / BEAM_OPEN_MS, 0, 1);
  const reach = top + (bottom - top) * open;
  const cx = centerX(boss);
  const half = (y) => beamHalfWidthAt(boss, y);

  for (let i = 0; i < 3; i++) {
    const pulse = 0.5 + 0.5 * Math.sin(boss.beamMs / 45 + i * 2);
    ctx.fillStyle = `rgba(80, 190, 255, ${0.1 + 0.12 * pulse})`;
    const shrink = 1 - i * 0.28;
    ctx.beginPath();
    ctx.moveTo(cx - BEAM_TOP_HALF_WIDTH * shrink, top);
    ctx.lineTo(cx + BEAM_TOP_HALF_WIDTH * shrink, top);
    ctx.lineTo(cx + half(reach) * shrink, reach);
    ctx.lineTo(cx - half(reach) * shrink, reach);
    ctx.closePath();
    ctx.fill();
  }
}

/* Silhuetas por tipo (desenhadas em um quadro de 40x32, olhando para baixo). */

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);

/** ABELHA: corpo oval amarelo, asas azuis curtas, ferrão e listra escura. */
function drawBeeShape(ctx, color, accent) {
  const wing = [[-6, -9], [-19, -14], [-20, -2], [-8, 3]];
  poly(ctx, wing, accent);
  poly(ctx, mirrorX(wing), accent);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.fillRect(-8, -4, 16, 2.5);
  ctx.fillRect(-6, 3, 4, 4);
  ctx.fillRect(2, 3, 4, 4);
  poly(ctx, [[-3, 12], [3, 12], [0, 18]], '#263238');
}

/** BORBOLETA: duas asas grandes vermelhas (alta e baixa), corpo fino e antenas. */
function drawButterflyShape(ctx, color, accent) {
  const upper = [[-3, -4], [-12, -16], [-21, -14], [-20, -2], [-3, 4]];
  const lower = [[-3, 4], [-20, 2], [-17, 12], [-8, 14], [-3, 9]];
  const patch = [[-6, -5], [-13, -11], [-17, -9], [-16, -3], [-6, 0]];
  for (const wing of [upper, lower]) {
    poly(ctx, wing, color);
    poly(ctx, mirrorX(wing), color);
  }
  poly(ctx, patch, accent);
  poly(ctx, mirrorX(patch), accent);
  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.5, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fafafa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, 12);
  ctx.lineTo(-6, 18);
  ctx.moveTo(2, 12);
  ctx.lineTo(6, 18);
  ctx.stroke();
}

/** BOSS: nave-capitânia (não é inseto): casco central, asas com canhões, cabine e emissor do feixe. */
function drawBossShape(ctx, color, accent) {
  const wing = [[-5, -6], [-19, -12], [-21, 4], [-5, 9]];
  poly(ctx, wing, color);
  poly(ctx, mirrorX(wing), color);
  const cannon = [[-21, -10], [-17, -10], [-17, 8], [-21, 8]];
  poly(ctx, cannon, accent);
  poly(ctx, mirrorX(cannon), accent);
  poly(ctx, [[-6, -13], [6, -13], [8, 4], [0, 15], [-8, 4]], color);
  const fin = [[-6, -13], [-11, -17], [-3, -13]];
  poly(ctx, fin, accent);
  poly(ctx, mirrorX(fin), accent);
  ctx.fillStyle = accent;
  ctx.fillRect(-7, -4, 14, 2.5);
  ctx.fillStyle = '#b3e5fc';
  ctx.beginPath();
  ctx.ellipse(0, 3, 3.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  poly(ctx, [[-3, 13], [3, 13], [0, 18]], accent);
}

const SHAPES = { bee: drawBeeShape, butterfly: drawButterflyShape, boss: drawBossShape };

function drawEnemy(ctx, e) {
  if (e.state === 'waiting') return;

  const cfg = ENEMY_TYPES[e.type];
  const color = enemyColor(e);
  // Sprite próprio do tipo (enemy-bee / enemy-butterfly / enemy-boss), se existir.
  const typed = getSprite(`enemy-${e.type}`);

  ctx.save();
  ctx.translate(centerX(e), centerY(e));
  ctx.rotate(e.angle);

  if (typed) {
    const img = color === cfg.color ? typed : getTinted(typed, `${e.type}:${color}`, color);
    ctx.drawImage(img, -e.width / 2, -e.height / 2, e.width, e.height);
  } else {
    ctx.save();
    ctx.scale(e.width / 40, e.height / 32);
    SHAPES[e.type](ctx, color, cfg.accent);
    ctx.restore();
  }

  // Nave capturada: viaja "atrás" do Boss (acima dele, na formação).
  if (e.captive) {
    const w = PLAYER_WIDTH * 0.6;
    const h = PLAYER_HEIGHT * 0.6;
    const y = -e.height / 2 - h - 2;
    const playerSprite = getSprite('player');
    if (playerSprite) {
      ctx.drawImage(getTinted(playerSprite, 'captive', COLORS.enemy), -w / 2, y, w, h);
    } else {
      ctx.fillStyle = COLORS.enemy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w / 2, y + h);
      ctx.lineTo(-w / 2, y + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawChallengeResult(ctx, state) {
  const ch = state.challenge;
  if (!ch?.resolved) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`NUMBER OF HITS  ${ch.hits}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.fillStyle = '#ffeb3b';
  ctx.fillText(
    `BONUS  ${ch.waveBonus + (ch.perfect ? CHALLENGE_PERFECT_BONUS : 0)}`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 14,
  );
  if (ch.perfect) {
    ctx.fillStyle = '#ef5350';
    ctx.fillText('PERFECT !', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 48);
  }
  ctx.restore();
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.imageSmoothingEnabled = false;

  // Tractor beams ficam atrás da nave e dos inimigos.
  for (const e of state.enemies) {
    if (e.state === 'beam') drawBeam(ctx, e, state.player);
  }

  const p = state.player;
  // Nave dupla: duas naves lado a lado.
  drawShip(ctx, p.x, p.y);
  if (p.dual) drawShip(ctx, p.x + PLAYER_WIDTH + DUAL_GAP, p.y);

  // Nave capturada destruída na formação: cai girando e some.
  if (state.lostCaptive) {
    const l = state.lostCaptive;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - l.t);
    ctx.translate(l.x, l.y + l.t * 120);
    ctx.rotate(l.t * 10);
    drawShip(ctx, -PLAYER_WIDTH * 0.3, -PLAYER_HEIGHT * 0.3);
    ctx.restore();
  }

  // Nave resgatada rodopiando / descendo para se encaixar.
  if (state.rescue) {
    const r = state.rescue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    drawShip(ctx, -PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2);
    ctx.restore();
  }

  for (const e of state.enemies) drawEnemy(ctx, e);

  const playerBulletSprite = getSprite('player-bullet');
  const enemyBulletSprite = getSprite('enemy-bullet');
  for (const b of state.bullets) {
    const isPlayer = b.owner === 'player';
    const sprite = isPlayer ? playerBulletSprite : enemyBulletSprite;
    if (sprite) {
      ctx.drawImage(sprite, b.x, b.y, b.width, b.height);
    } else {
      ctx.fillStyle = isPlayer ? COLORS.playerBullet : COLORS.enemyBullet;
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }
  }

  drawChallengeResult(ctx, state);
}