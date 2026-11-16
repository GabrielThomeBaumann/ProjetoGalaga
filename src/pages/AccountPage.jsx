import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import { fetchMyHighScore } from '../services/scoreService';
import formStyles from '../styles/AuthForm.module.css';
import styles from './AccountPage.module.css';

/** Área protegida: mostra a sessão autenticada e oferece logout. */
export default function AccountPage() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const [highScore, setHighScore] = useState(null);
  const [scoreFailed, setScoreFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    fetchMyHighScore(user.id)
      .then((value) => {
        if (active) setHighScore(value);
      })
      .catch(() => {
        if (active) setScoreFailed(true);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    setError('');
    setSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setSigningOut(false);
    }
  };

  let scoreText = 'Carregando...';
  if (scoreFailed) scoreText = 'Indisponível no momento';
  else if (highScore !== null) scoreText = highScore > 0 ? String(highScore) : 'Nenhum ainda';

  return (
    <AuthLayout
      title="Minha conta"
      footer={
        <Link className={formStyles.link} to="/">
          Voltar ao menu
        </Link>
      }
    >
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt className={styles.term}>Nome no ranking</dt>
          <dd className={styles.value}>{displayName ?? 'Jogador'}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.term}>Seu recorde</dt>
          <dd className={styles.value}>{scoreText}</dd>
        </div>
      </dl>

      {error && (
        <p className={formStyles.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Link className={formStyles.submit} to="/game">
          Jogar
        </Link>
        <Link className={`${formStyles.submit} ${formStyles.secondary}`} to="/leaderboard">
          Ver ranking
        </Link>
        <button
          type="button"
          className={`${formStyles.submit} ${formStyles.secondary}`}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    </AuthLayout>
  );
}