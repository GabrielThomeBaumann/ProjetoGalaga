import { forwardRef } from 'react';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import styles from './GameCanvas.module.css';

const GameCanvas = forwardRef(function GameCanvas({ overlay = null }, ref) {
  return (
    <div className={styles.wrapper}>
      <canvas
        ref={ref}
        className={styles.canvas}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
      {overlay}
    </div>
  );
});

export default GameCanvas;