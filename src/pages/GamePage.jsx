import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import StarfieldBackground from '../components/StarfieldBackground';
import { useAuth } from '../contexts/AuthContext';
import { usePendingScore } from '../contexts/PendingScoreContext';
import { PLAYER_LIVES } from '../game/constants';
import { useGame } from '../game/useGame';
import {
  fetchMyHighScore,
  fetchTopScore,
  submitScore,
} from '../services/scoreService';
import styles from './GamePage.module.css';

const INITIAL_HUD = {
  score: 0,
  lives: PLAYER_LIVES,
  status: 'playing',
  stage: 1,
  isChallengeStage: false,
};

// Situação do registro da pontuação ao fim da partida:
// idle (jogando) | none (0 pontos) | guest (sem login) | saving | saved | error
const IDLE_SAVE = { phase: 'idle' };

function getSaveMessage(save) {
  switch (save.phase) {
    case 'guest':
      return {
        tone: 'info',
        text: 'Entre ou crie uma conta para registrar esta pontuação no ranking.',
      };
    case 'saving':
      return { tone: 'info', text: 'Salvando pontuação...' };
    case 'saved':
      return save.isRecord
        ? { tone: 'ok', text: `Novo recorde pessoal: ${save.best}!` }
        : { tone: 'info', text: `Seu recorde continua ${save.best}.` };
    case 'error':
      return {
        tone: 'error',
        text: 'Não foi possível salvar a pontuação.',
      };
    default:
      return null;
  }
}

export default function GamePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setPendingScore } = usePendingScore();

  const [hud, setHud] = useState(INITIAL_HUD);
  const [showMessage, setShowMessage] = useState(true);
  const [topScore, setTopScore] = useState(0); // maior pontuação registrada
  const [save, setSave] = useState(IDLE_SAVE);

  // Estado para navegação por teclado nos menus
  const [selectedIndex, setSelectedIndex] = useState(0);

  const endHandledRef = useRef(false); // o fim da partida atual já foi tratado?
  const runIdRef = useRef(0); // descarta respostas de partidas antigas

  const highScore = Math.max(topScore, hud.score);

  // Recorde exibido no HUD = maior pontuação do ranking.
  useEffect(() => {
    let active = true;
    fetchTopScore()
      .then((value) => {
        if (active) setTopScore(value);
      })
      .catch(() => {
        // Sem conexão: o jogo continua funcionando, só sem o recorde global.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleHudChange = useCallback((snapshot) => {
    setHud(snapshot);
    // Quando entra em pause, game over ou vitória, reseta a seleção
    if (snapshot.status !== 'playing') {
      setSelectedIndex(0);
    }
  }, []);

  const { canvasRef, restart, togglePause } = useGame({
    onHudChange: handleHudChange,
  });

  useEffect(() => {
    if (hud.status === 'playing') {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hud.stage, hud.status]);

  // Grava a pontuação no Supabase (só para quem está logado).
  const saveScore = useCallback(
    async (score) => {
      if (!user) return;
      const runId = ++runIdRef.current;
      setSave({ phase: 'saving' });
      try {
        const previousBest = await fetchMyHighScore(user.id);
        const row = await submitScore(score);
        if (runId !== runIdRef.current) return;
        setTopScore((current) => Math.max(current, row.best_score));
        setSave({
          phase: 'saved',
          isRecord: score > previousBest,
          best: row.best_score,
        });
      } catch {
        if (runId !== runIdRef.current) return;
        setSave({ phase: 'error' });
      }
    },
    [user],
  );

  // Fim de jogo (derrota ou vitória):
  // - com login: registra no Supabase;
  // - sem login: guarda a pontuação pendente em memória (contexto) e
  //   oferece entrar/criar conta. Nada é gravado no navegador.
  useEffect(() => {
    if (hud.status === 'playing') {
      endHandledRef.current = false;
      runIdRef.current += 1;
      setSave(IDLE_SAVE);
      return;
    }
    if (hud.status === 'paused') return;
    if (authLoading || endHandledRef.current) return;
    endHandledRef.current = true;

    if (hud.score <= 0) {
      setSave({ phase: 'none' });
      return;
    }

    if (!user) {
      // Mantém a maior pontuação pendente, caso a pessoa jogue de novo antes de entrar.
      setPendingScore((prev) =>
        prev === null ? hud.score : Math.max(prev, hud.score),
      );
      setSave({ phase: 'guest' });
      return;
    }

    saveScore(hud.score);
  }, [hud.status, hud.score, user, authLoading, saveScore, setPendingScore]);

  // Ações do menu dependendo do status
  let menuActions = [];
  if (hud.status === 'paused') {
    menuActions = [
      { label: 'Continuar', action: togglePause },
      { label: 'Voltar ao Menu', action: () => navigate('/') },
    ];
  } else if (hud.status === 'won' || hud.status === 'lost') {
    if (save.phase === 'guest') {
      menuActions.push(
        { label: 'Entrar', action: () => navigate('/login') },
        { label: 'Criar conta', action: () => navigate('/register') },
      );
    }
    if (save.phase === 'error') {
      menuActions.push({
        label: 'Tentar de novo',
        action: () => saveScore(hud.score),
      });
    }
    if (save.phase === 'saved') {
      menuActions.push({
        label: 'Ver ranking',
        action: () => navigate('/leaderboard'),
      });
    }
    menuActions.push(
      { label: 'Reiniciar', action: restart },
      { label: 'Voltar ao Menu', action: () => navigate('/') },
    );
  }

  // Escuta as teclas para navegar no menu
  useEffect(() => {
    if (menuActions.length === 0) return;

    const handleMenuKeys = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (e.code === 'ArrowUp') return prev > 0 ? prev - 1 : menuActions.length - 1;
          return prev < menuActions.length - 1 ? prev + 1 : 0;
        });
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const index = Math.min(selectedIndex, menuActions.length - 1);
        menuActions[index].action();
      }
    };

    window.addEventListener('keydown', handleMenuKeys);
    return () => window.removeEventListener('keydown', handleMenuKeys);
  }, [menuActions, selectedIndex]);

  const saveMessage = getSaveMessage(save);

  let overlay = null;

  if (hud.status !== 'playing') {
    overlay = (
      <div className={styles.overlay}>
        <h2
          className={
            hud.status === 'won' ? styles.win : hud.status === 'lost' ? styles.lose : ''
          }
        >
          {hud.status === 'won'
            ? 'VOCÊ VENCEU!'
            : hud.status === 'lost'
              ? 'GAME OVER'
              : 'JOGO PAUSADO'}
        </h2>

        {hud.status !== 'paused' && (
          <p>
            Score final: {hud.score} · Fase: {hud.stage}
          </p>
        )}

        {hud.status !== 'paused' && saveMessage && (
          <p
            className={`${styles.saveMessage} ${styles[saveMessage.tone]}`}
            role="status"
          >
            {saveMessage.text}
          </p>
        )}

        <nav className={styles.menu} aria-label="Menu do jogo">
          {menuActions.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              data-selected={index === selectedIndex}
              onClick={item.action}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className={styles.arrow} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={styles.layout}>
        <GameCanvas
          ref={canvasRef}
          overlay={
            <>
              {overlay}
              {showMessage && hud.status === 'playing' && (
                <div className={styles.stageMessage}>
                  <h1 className={styles.stageText}>
                    {hud.isChallengeStage ? 'CHALLENGE STAGE' : `STAGE ${hud.stage}`}
                  </h1>
                </div>
              )}
            </>
          }
        />

        <HUD score={hud.score} highScore={highScore} lives={hud.lives} />
      </div>

      <p className={styles.help}>← → / A D: mover · Espaço: atirar · ESC: Pausar</p>
    </section>
  );
}