import styles from './TouchControls.module.css';

/**
 * Botões na tela para celular/tablet. Alimentam o mesmo input do teclado.
 * Só aparecem em dispositivos de toque (ver @media (pointer: coarse) no CSS).
 */
export default function TouchControls({ onInput, onPause }) {
  // pointer capture: o botão continua "pressionado" mesmo se o dedo escorregar.
  const hold = (action) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onInput(action, true);
    },
    onPointerUp: () => onInput(action, false),
    onPointerCancel: () => onInput(action, false),
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div className={styles.controls}>
      <div className={styles.move}>
        <button
          type="button"
          className={styles.btn}
          aria-label="Mover para a esquerda"
          {...hold('left')}
        >
          ◀
        </button>
        <button
          type="button"
          className={styles.btn}
          aria-label="Mover para a direita"
          {...hold('right')}
        >
          ▶
        </button>
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
        {...hold('shoot')}
      >
        FIRE
      </button>
    </div>
  );
}