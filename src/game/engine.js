import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  CHALLENGE_STAGE_FREQUENCY,
  ENEMY_BULLET_HEIGHT,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_WIDTH,
  ENEMY_COLS,
  ENEMY_DESCENT_SPEED,
  ENEMY_GAP_X,
  ENEMY_GAP_Y,
  ENEMY_HEIGHT,
  ENEMY_KILL_SCORE,
  ENEMY_ROWS,
  ENEMY_SHOOT_INTERVAL_MS,
  ENEMY_START_Y,
  ENEMY_SWAY_AMPLITUDE,
  ENEMY_SWAY_FREQUENCY,
  ENEMY_WIDTH,
  PLAYER_BULLET_HEIGHT,
  PLAYER_BULLET_SPEED,
  PLAYER_BULLET_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_LIVES,
  PLAYER_SHOOT_COOLDOWN_MS,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y_MARGIN,
} from './constants';
import { createBullet, createEnemy, createPlayer } from './entities';
import { getSprite } from './sprites';

/** @typedef {import('./entities').GameState} GameState */
/** @typedef {import('./entities').InputState} InputState */
/** @typedef {import('./entities').HudSnapshot} HudSnapshot */
/** @typedef {import('./entities').Rect} Rect */

/* ----------------------------- Criação ----------------------------- */

function createEnemies(isChallengeStage) {
  const enemies = [];
  
  // O Challenge Stage fica vazio por enquanto (você adicionará os inimigos em círculo depois)
  if (isChallengeStage) return enemies;

  const gridWidth = ENEMY_COLS * ENEMY_WIDTH + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (CANVAS_WIDTH - gridWidth) / 2;

  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push(
        createEnemy({
          x: startX + col * (ENEMY_WIDTH + ENEMY_GAP_X),
          y: ENEMY_START_Y + row * (ENEMY_HEIGHT + ENEMY_GAP_Y),
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
        }),
      );
    }
  }
  return enemies;
}

/** @returns {GameState} */
export function createInitialState(stage = 1) {
  const isChallengeStage = stage > 1 && stage % CHALLENGE_STAGE_FREQUENCY === 0;

  return {
    status: 'playing',
    stage,
    isChallengeStage,
    player: createPlayer({
      x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - PLAYER_Y_MARGIN,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      lives: PLAYER_LIVES,
    }),
    enemies: createEnemies(isChallengeStage),
    bullets: [],
    score: 0,
    time: 0,
    enemyShootTimerMs: 0,
  };
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

export function toHudSnapshot(state) {
  return {
    score: state.score,
    lives: state.player.lives,
    status: state.status,
    stage: state.stage,
    isChallengeStage: state.isChallengeStage,
  };
}

/* ----------------------------- Update ----------------------------- */

export function update(state, input, dtMs, nowMs, random = Math.random) {
  if (state.status !== 'playing') return state;

  const dt = dtMs / 1000;
  state.time += dt;

  updatePlayer(state, input, dt, nowMs);
  updateEnemies(state, dt);
  
  if (!state.isChallengeStage) {
    updateEnemyShooting(state, dtMs, random);
  }
  
  updateBullets(state, dt);
  resolveCollisions(state);
  cleanup(state);
  updateStatus(state);

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
    state.bullets.push(
      createBullet({
        x: player.x + (player.width - PLAYER_BULLET_WIDTH) / 2,
        y: player.y - PLAYER_BULLET_HEIGHT,
        width: PLAYER_BULLET_WIDTH,
        height: PLAYER_BULLET_HEIGHT,
        vy: -PLAYER_BULLET_SPEED,
        owner: 'player',
      }),
    );
  }
}

function updateEnemies(state, dt) {
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    
    enemy.x =
      enemy.baseX +
      Math.sin(state.time * ENEMY_SWAY_FREQUENCY + enemy.phase) *
        ENEMY_SWAY_AMPLITUDE;
        
    enemy.y += ENEMY_DESCENT_SPEED * dt;

    if (enemy.y > CANVAS_HEIGHT) {
      enemy.y = -enemy.height; 
    }
  }
}

function updateEnemyShooting(state, dtMs, random) {
  state.enemyShootTimerMs += dtMs;
  if (state.enemyShootTimerMs < ENEMY_SHOOT_INTERVAL_MS) return;
  state.enemyShootTimerMs -= ENEMY_SHOOT_INTERVAL_MS;

  const alive = state.enemies.filter((e) => e.active);
  if (alive.length === 0) return;

  const shooter = alive[Math.floor(random() * alive.length)];
  state.bullets.push(
    createBullet({
      x: shooter.x + (shooter.width - ENEMY_BULLET_WIDTH) / 2,
      y: shooter.y + shooter.height,
      width: ENEMY_BULLET_WIDTH,
      height: ENEMY_BULLET_HEIGHT,
      vy: ENEMY_BULLET_SPEED,
      owner: 'enemy',
    }),
  );
}

function updateBullets(state, dt) {
  for (const bullet of state.bullets) {
    bullet.y += bullet.vy * dt;
    if (bullet.y + bullet.height < 0 || bullet.y > CANVAS_HEIGHT) {
      bullet.active = false;
    }
  }
}

function resolveCollisions(state) {
  const { player } = state;

  for (const bullet of state.bullets) {
    if (!bullet.active) continue;

    if (bullet.owner === 'player') {
      for (const enemy of state.enemies) {
        if (enemy.active && intersects(bullet, enemy)) {
          bullet.active = false;
          enemy.active = false;
          state.score += ENEMY_KILL_SCORE;
          break;
        }
      }
    } else if (intersects(bullet, player)) {
      bullet.active = false;
      player.lives -= 1;
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.active && intersects(enemy, player)) {
      enemy.active = false;
      player.lives -= 1;
    }
  }

  player.lives = Math.max(player.lives, 0);
}

function cleanup(state) {
  state.bullets = state.bullets.filter((b) => b.active);
  state.enemies = state.enemies.filter((e) => e.active);
}

function updateStatus(state) {
  if (state.player.lives <= 0) {
    state.status = 'lost';
    return;
  }

  // Se for um Challenge Stage e não houver inimigos, esperamos 3 segundos 
  // (usando o state.time que já conta o tempo) antes de avançar para a próxima.
  if (state.isChallengeStage && state.enemies.length === 0) {
    if (state.time > 3) {
      state.stage += 1;
      state.isChallengeStage = state.stage % CHALLENGE_STAGE_FREQUENCY === 0;
      state.time = 0;
      state.enemies = createEnemies(state.isChallengeStage);
    }
    return; // Impede que o código pule a fase imediatamente
  }
  
  // Se for uma fase normal e os inimigos acabaram, avança para a próxima
  if (!state.isChallengeStage && state.enemies.length === 0) {
    state.stage += 1;
    state.isChallengeStage = state.stage % CHALLENGE_STAGE_FREQUENCY === 0;
    state.time = 0; 
    state.enemies = createEnemies(state.isChallengeStage);
  }
}

/* ----------------------------- Render ----------------------------- */

export function render(ctx, state) {
  // O canvas é transparente: o fundo de estrelas aparece por trás do jogo.
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.imageSmoothingEnabled = false; // mantém o visual pixelado

  // Nave do jogador (usa a imagem se existir; senão, o triângulo).
  const p = state.player;
  const playerSprite = getSprite('player');
  if (playerSprite) {
    ctx.drawImage(playerSprite, p.x, p.y, p.width, p.height);
  } else {
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y);
    ctx.lineTo(p.x + p.width, p.y + p.height);
    ctx.lineTo(p.x, p.y + p.height);
    ctx.closePath();
    ctx.fill();
  }

  // Inimigos (usa a imagem se existir; senão, o triângulo).
  const enemySprite = getSprite('enemy');
  ctx.fillStyle = COLORS.enemy;
  for (const e of state.enemies) {
    if (enemySprite) {
      ctx.drawImage(enemySprite, e.x, e.y, e.width, e.height);
    } else {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + e.width, e.y);
      ctx.lineTo(e.x + e.width / 2, e.y + e.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const b of state.bullets) {
    ctx.fillStyle =
      b.owner === 'player' ? COLORS.playerBullet : COLORS.enemyBullet;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
}