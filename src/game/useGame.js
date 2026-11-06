import { useCallback, useEffect, useRef } from 'react';
import { createInitialState, render, toHudSnapshot, update } from './engine';
import { createInput } from './entities';

const MAX_DT_MS = 50; // evita "saltos" ao voltar de outra aba

function keyToAction(code) {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return 'left';
    case 'ArrowRight':
    case 'KeyD':
      return 'right';
    case 'Space':
      return 'shoot';
    default:
      return null;
  }
}

/**
 * Inicializa o loop do jogo no canvas e expõe `restart`.
 *
 * @param {{ onHudChange: (snapshot: import('./entities').HudSnapshot) => void }} options
 */
export function useGame({ onHudChange }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const inputRef = useRef(createInput());
  const lastHudRef = useRef(null);

  if (stateRef.current === null) {
    stateRef.current = createInitialState();
  }

  // Mantém o callback mais recente sem recriar o loop.
  const onHudChangeRef = useRef(onHudChange);
  useEffect(() => {
    onHudChangeRef.current = onHudChange;
  }, [onHudChange]);

  const pushHudIfChanged = useCallback(() => {
    const next = toHudSnapshot(stateRef.current);
    const prev = lastHudRef.current;
    if (
      !prev ||
      prev.score !== next.score ||
      prev.lives !== next.lives ||
      prev.status !== next.status
    ) {
      lastHudRef.current = next;
      onHudChangeRef.current(next);
    }
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    inputRef.current = createInput();
    pushHudIfChanged();
  }, [pushHudIfChanged]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Teclado global
    const handleKeyDown = (e) => {
      const action = keyToAction(e.code);
      if (!action) return;
      e.preventDefault(); // evita rolagem da página com Espaço/setas
      inputRef.current[action] = true;
    };
    const handleKeyUp = (e) => {
      const action = keyToAction(e.code);
      if (!action) return;
      inputRef.current[action] = false;
    };
    const handleBlur = () => {
      inputRef.current = createInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Loop com delta time
    let rafId = 0;
    let lastTime = null;

    const frame = (now) => {
      const dtMs = lastTime === null ? 0 : Math.min(now - lastTime, MAX_DT_MS);
      lastTime = now;

      update(stateRef.current, inputRef.current, dtMs, now);
      render(ctx, stateRef.current);
      pushHudIfChanged();

      rafId = requestAnimationFrame(frame);
    };

    pushHudIfChanged();
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pushHudIfChanged]);

  return { canvasRef, restart };
}