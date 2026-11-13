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
  MAX_STAGE,
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
} from './constants';
import { createBullet, createEnemy, createPlayer } from './entities';
import { getSprite } from './sprites';

/** @typedef {import('./entities').GameState} GameState */
/** @typedef {import('./entities').InputState} InputState */
/** @typedef {import('./entities').HudSnapshot} HudSnapshot */
/** @typedef {import('./entities').Rect} Rect */

const ENTRY_DURATION_MS = 2500; // Tempo que leva para fazer a curva e entrar na formação

/* ----------------------------- Criação ----------------------------- */

function createEnemies(isChallengeStage) {
  const enemies = [];
  
  if (isChallengeStage) return enemies;

  const gridWidth = ENEMY_COLS * ENEMY_WIDTH + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (CANVAS_WIDTH - gridWidth) / 2;

  let delay = 0;

  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      const targetX = startX + col * (ENEMY_WIDTH + ENEMY_GAP_X);
      const targetY = ENEMY_START_Y + row * (ENEMY_HEIGHT + ENEMY_GAP_Y);
      
      // Define de onde ele vem (esquerda, direita ou topo)
      const entryType = col < 2 ? 'left' : col > 2 ? 'right' : 'top';

      // Define o ponto de partida
      let startXPos = targetX;
      let startYPos = -ENEMY_HEIGHT - delay;
      
      if (entryType === 'left') startXPos = -ENEMY_WIDTH - delay;
      if (entryType === 'right') startXPos = CANVAS_WIDTH + delay;

      const enemy = createEnemy({
        x: startXPos,
        y: startYPos,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
      });

      // Configura a animação de entrada
      enemy.state = 'entering';
      enemy.startX = startXPos;
      enemy.startY = startYPos;
      enemy.targetX = targetX;
      enemy.targetY = targetY;
      enemy.baseX = targetX; // O centro da formação
      enemy.pathProgress = 0;
      enemy.entryType = entryType;

      enemies.push(enemy);
      delay += 120; // Fila indiana
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
    // Fila de eventos do frame (sons). O som de início só vale para a fase 1.
    events: stage === 1 ? ['gameStart'] : [],
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

function getPlayerHitbox(player) {
  return {
    x: player.x + (player.width - PLAYER_HITBOX_WIDTH) / 2,
    y: player.y + (player.height - PLAYER_HITBOX_HEIGHT) / 2,
    width: PLAYER_HITBOX_WIDTH,
    height: PLAYER_HITBOX_HEIGHT,
  };
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
  updateEnemies(state, dt, dtMs);
  
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

function updateEnemies(state, dt, dtMs) {
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    if (enemy.state === 'entering') {
      // Avança o progresso (0 a 1)
      enemy.pathProgress += dtMs / ENTRY_DURATION_MS;
      
      if (enemy.pathProgress >= 1) {
        // Chegou ao destino, entra na formação
        enemy.state = 'formation';
        enemy.x = enemy.targetX;
        enemy.y = enemy.targetY;
      } else {
        // Animação da curva de entrada
        const t = enemy.pathProgress;
        
        // Interpolação linear (Lerp) - garante que chegue no destino exato
        let currentX = enemy.startX + (enemy.targetX - enemy.startX) * t;
        let currentY = enemy.startY + (enemy.targetY - enemy.startY) * t;

        // Adiciona a "acrobacia" (movimento em onda)
        if (enemy.entryType === 'left' || enemy.entryType === 'right') {
          // Faz um arco no eixo Y se vier da lateral
          currentY += Math.sin(t * Math.PI) * 200;
        } else {
          // Faz um "S" no eixo X se vier do topo
          currentX += Math.sin(t * Math.PI * 2) * 150;
        }

        enemy.x = currentX;
        enemy.y = currentY;
      }
    } else {
      // Movimento normal da formação (zigue-zague)
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
}

function updateEnemyShooting(state, dtMs, random) {
  state.enemyShootTimerMs += dtMs;
  if (state.enemyShootTimerMs < ENEMY_SHOOT_INTERVAL_MS) return;
  state.enemyShootTimerMs -= ENEMY_SHOOT_INTERVAL_MS;

  // Só atiram se já estiverem na formação
  const alive = state.enemies.filter((e) => e.active && e.state === 'formation');
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
  const hitbox = getPlayerHitbox(player);

  for (const bullet of state.bullets) {
    if (!bullet.active) continue;

    if (bullet.owner === 'player') {
      for (const enemy of state.enemies) {
        if (enemy.active && intersects(bullet, enemy)) {
          bullet.active = false;
          enemy.active = false;
          state.score += ENEMY_KILL_SCORE;
          state.events.push('enemyKill');
          break;
        }
      }
    } else if (intersects(bullet, hitbox)) {
      bullet.active = false;
      player.lives -= 1;
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.active && intersects(enemy, hitbox)) {
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
    state.events.push('death'); // só quando perde de fato
    return;
  }

  if (state.isChallengeStage && state.enemies.length === 0) {
    if (state.time > 3) {
      if (state.stage + 1 > MAX_STAGE) {
        state.status = 'won';
        return;
      }
      state.stage += 1;
      state.isChallengeStage = state.stage % CHALLENGE_STAGE_FREQUENCY === 0;
      state.time = 0;
      state.enemies = createEnemies(state.isChallengeStage);
    }
    return; 
  }
  
  if (!state.isChallengeStage && state.enemies.length === 0) {
    if (state.stage + 1 > MAX_STAGE) {
      state.status = 'won';
      return;
    }
    state.stage += 1;
    state.isChallengeStage = state.stage % CHALLENGE_STAGE_FREQUENCY === 0;
    state.time = 0; 
    state.enemies = createEnemies(state.isChallengeStage);
  }
}

/* ----------------------------- Render ----------------------------- */

export function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.imageSmoothingEnabled = false; 

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
}