import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { fetchRanking } from '../services/scoreService';
import formStyles from '../styles/AuthForm.module.css';
import styles from './LeaderboardPage.module.css';

const RANKING_LIMIT = 20;
const scoreFormat = new Intl.NumberFormat('pt-BR');

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [entries, setEntries] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    fetchRanking(RANKING_LIMIT)
      .then((data) => {
        if (!active) return;
        setEntries(data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  let content;
  if (status === 'loading') {
    content = <p className={styles.state}>Carregando ranking...</p>;
  } else if (status === 'error') {
    content = (
      <>
        <p className={`${styles.state} ${styles.stateError}`} role="alert">
          Não foi possível carregar o ranking.
        </p>
        <button
          type="button"
          className={`${formStyles.submit} ${formStyles.secondary}`}
          onClick={retry}
        >
          Tentar de novo
        </button>
      </>
    );
  } else if (entries.length === 0) {
    content = (
      <p className={styles.state}>
        Ninguém registrou pontuação ainda. Jogue e seja o primeiro do ranking!
      </p>
    );
  } else {
    content = (
      <div>
        <div className={styles.head} aria-hidden="true">
          <span>#</span>
          <span>Jogador</span>
          <span className={styles.headScore}>Pontos</span>
        </div>
        <ol className={styles.list}>
          {entries.map((entry, index) => {
            const isMe = user?.id === entry.user_id;
            return (
              <li
                key={entry.user_id}
                className={styles.row}
                data-rank={index < 3 ? index + 1 : undefined}
                data-me={isMe}
              >
                <span className={styles.pos}>{index + 1}</span>
                <span className={styles.name}>
                  {entry.display_name}
                  {isMe && <span className={styles.you}> (você)</span>}
                </span>
                <span className={styles.score}>
                  {scoreFormat.format(entry.best_score)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Ranking"
      subtitle="Maior pontuação de cada jogador"
      wide
      footer={
        <>
          {!user && (
            <p>
              <Link className={formStyles.link} to="/login">
                Entre
              </Link>{' '}
              para registrar sua pontuação aqui.
            </p>
          )}
          <Link className={formStyles.link} to="/game">
            Jogar
          </Link>
          <Link className={formStyles.link} to="/">
            Voltar ao menu
          </Link>
        </>
      }
    >
      {content}
    </AuthLayout>
  );
}