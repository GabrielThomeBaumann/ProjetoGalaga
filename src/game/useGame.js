import { useCallback, useEffect, useRef } from 'react';
import { createInitialState, render, toHudSnapshot, update } from './engine';
import { createInput } from './entities';

const MAX_DT_MS = 50; 

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
    case 'Escape':
      return 'pause'; 
    default:
      return null;
  }
}

export function useGame({ onHudChange }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const inputRef = useRef(createInput());
  const lastHudRef = useRef(null);

  if (stateRef.current === null) {
    stateRef.current = createInitialState();
  }

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
      prev.status !== next.status ||
      prev.stage !== next.stage ||
      prev.isChallengeStage !== next.isChallengeStage
    ) {
      lastHudRef.current = next;
      onHudChangeRef.current(next);
    }
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState(1);
    inputRef.current = createInput();
    lastHudRef.current = null; // Força atualização
    pushHudIfChanged();
  }, [pushHudIfChanged]);

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.status === 'playing') {
      state.status = 'paused';
    } else if (state.status === 'paused') {
      state.status = 'playing';
    }
    pushHudIfChanged();
  }, [pushHudIfChanged]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const handleKeyDown = (e) => {
      const action = keyToAction(e.code);
      if (!action) return;
      e.preventDefault(); 

      if (action === 'pause') {
        if (e.repeat) return;
        const state = stateRef.current;
        if (state.status === 'playing') {
          state.status = 'paused';
        } else if (state.status === 'paused') {
          state.status = 'playing';
        }
        pushHudIfChanged();
        return;
      }

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

  return { canvasRef, restart, togglePause };
}