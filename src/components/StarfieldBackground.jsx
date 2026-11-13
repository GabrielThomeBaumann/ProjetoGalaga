import { useEffect, useRef } from 'react';
import styles from './StarfieldBackground.module.css';

// Cores dos "pixels" no estilo do Galaga original (NES/arcade).
const DARK_COLORS = [
  '#ffffff',
  '#ff3b30',
  '#4dd0e1',
  '#ffeb3b',
  '#66bb6a',
  '#ff9800',
  '#7c4dff',
  '#2979ff',
];

// Versões mais escuras, para aparecerem no fundo claro.
const LIGHT_COLORS = [
  '#14141f',
  '#d32f2f',
  '#00838f',
  '#f9a825',
  '#2e7d32',
  '#ef6c00',
  '#5e35b1',
  '#1565c0',
];

const STAR_COUNT = 90;
const MIN_SPEED = 20; // px/s
const MAX_SPEED = 140; // px/s

function createStar(width, height, spawnAnywhere) {
  const size = Math.random() < 0.8 ? 2 : 3;
  return {
    x: Math.floor(Math.random() * width),
    y: spawnAnywhere
      ? Math.floor(Math.random() * height)
      : height + Math.floor(Math.random() * 40),
    size,
    speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
    colorIndex: Math.floor(Math.random() * DARK_COLORS.length),
    // Cada estrela pisca em um ritmo próprio.
    blinkRate: 1 + Math.random() * 3,
    blinkPhase: Math.random() * Math.PI * 2,
  };
}

export default function StarfieldBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let stars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: STAR_COUNT }, () =>
        createStar(canvas.width, canvas.height, true),
      );
    };

    const draw = (time) => {
      const light = document.documentElement.dataset.theme === 'light';
      const palette = light ? LIGHT_COLORS : DARK_COLORS;
      ctx.fillStyle = light ? '#f2f2f8' : '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const visible = Math.sin(time * s.blinkRate + s.blinkPhase) > -0.6;
        if (!visible) continue;
        ctx.fillStyle = palette[s.colorIndex];
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      draw(0);
      // Sem animação: redesenha quando o tema mudar.
      const observer = new MutationObserver(() => draw(0));
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', resize);
      };
    }

    let rafId = 0;
    let last = null;

    const frame = (now) => {
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.y -= s.speed * dt; // sobe na tela
        if (s.y + s.size < 0) {
          stars[i] = createStar(canvas.width, canvas.height, false);
        }
      }

      draw(now / 1000);
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}