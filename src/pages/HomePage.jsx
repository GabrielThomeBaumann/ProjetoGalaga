import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

const MENU_ITEMS = [
  { label: 'Start', to: '/game' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Login', to: '/login' },
  { label: 'Configurações', to: '/settings' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>GALAGA</h1>
      <div className={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.to}
            type="button"
            className={styles.button}
            onClick={() => navigate(item.to)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}