import { useRef } from 'react';
import styles from './TouchControls.module.css';

/**
 * Botões na tela para celular/tablet. Alimentam o mesmo input do teclado.
 * O par ◀ ▶ é uma zona única: dá para deslizar o dedo de um lado ao outro.
 */
export default function TouchControls({ onInput, onPause }) {
  const moveRef = useRef(null);
  const movingRef = useRef(false);

  const setDirection = (dir) => {
    onInput('left', dir === 'left');
    onInput('right', dir === 'right');
  };

  const dirFromEvent = (e) => {
    const rect = moveRef.current.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
  };

  const moveHandlers = {
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      movingRef.current = true;
      setDirection(dirFromEvent(e));
    },
    onPointerMove: (e) => {
      if (movingRef.current) setDirection(dirFromEvent(e));
    },
    onPointerUp: () => {
      movingRef.current = false;
      setDirection(null);
    },
    onPointerCancel: () => {
      movingRef.current = false;
      setDirection(null);
    },
    onContextMenu: (e) => e.preventDefault(),
  };

  const fireHandlers = {
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onInput('shoot', true);
    },
    onPointerUp: () => onInput('shoot', false),
    onPointerCancel: () => onInput('shoot', false),
    onContextMenu: (e) => e.preventDefault(),
  };

  return (
    <div className={styles.controls}>
      <div ref={moveRef} className={styles.move} {...moveHandlers}>
        <span className={styles.btn} aria-label="Mover para a esquerda">
          ◀
        </span>
        <span className={styles.btn} aria-label="Mover para a direita">
          ▶
        </span>
      </div>

      <button
        type="button"
        className={`${styles.btn} ${styles.small}`}
        aria-label="Pausar"
        onClick={onPause}
      >
        II
      </button>

      <button
        type="button"
        className={`${styles.btn} ${styles.fire}`}
        aria-label="Atirar"
        {...fireHandlers}
      >
        FIRE
      </button>
    </div>
  );
}