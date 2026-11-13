// Efeitos sonoros (Web Audio API).
// Coloque os arquivos em src/assets/sounds/ (wav, mp3 ou ogg):
//   game-start, enemy-kill, death
// Se um arquivo não existir, playSound() simplesmente não faz nada.

const STORAGE_KEY = 'galaga-volume';
const DEFAULT_VOLUME = 0.7;
const SOUND_NAMES = ['game-start', 'enemy-kill', 'death'];

const files = import.meta.glob('../assets/sounds/*.{wav,mp3,ogg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function findAsset(name) {
  for (const [path, url] of Object.entries(files)) {
    const file = path.split('/').pop().toLowerCase();
    if (file.startsWith(`${name}.`)) return url;
  }
  return null;
}

function readVolume() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const value = Number(raw);
    return Number.isFinite(value)
      ? Math.min(Math.max(value, 0), 1)
      : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

// Curva quadrática: o ouvido percebe o volume de forma não linear,
// então o slider fica mais natural assim.
const toGain = (v) => v * v;

let volume = readVolume();
let ctx = null;
let master = null;
const buffers = {};

async function load(name) {
  const url = findAsset(name);
  if (!url || !ctx) return;
  try {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    buffers[name] = await ctx.decodeAudioData(data);
  } catch {
    console.warn(`[sounds] Não consegui carregar "${name}" em: ${url}`);
  }
}

if (typeof window !== 'undefined') {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) {
    ctx = new AudioCtor();
    master = ctx.createGain();
    master.gain.value = toGain(volume);
    master.connect(ctx.destination);

    // Navegadores deixam o contexto "suspenso" até o primeiro gesto do usuário.
    const unlock = () => {
      if (ctx.state === 'suspended') ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    SOUND_NAMES.forEach(load);
  }
}

export function playSound(name) {
  const buffer = buffers[name];
  if (!ctx || !buffer || volume === 0) return;
  if (ctx.state === 'suspended') ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(master);
  source.start();
}

/** Volume de 0 a 1. */
export function getVolume() {
  return volume;
}

export function setVolume(value) {
  volume = Math.min(Math.max(value, 0), 1);
  if (master) master.gain.value = toGain(volume);
  try {
    localStorage.setItem(STORAGE_KEY, String(volume));
  } catch {
    // sem localStorage: vale só nesta sessão
  }
}