import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarfieldBackground from '../components/StarfieldBackground';
import styles from './HomePage.module.css';

const MENU_ITEMS = [
  { label: 'Start', to: '/game' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Conquistas', to: '/achievements' },
  { label: 'Login', to: '/login' },
  { label: 'Configurações', to: '/settings' },
];

// Coloque o arquivo da logo em: public/images/galaga-logo.png
const LOGO_SRC = `${import.meta.env.BASE_URL}images/galaga-logo.png`;

export default function HomePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const itemRefs = useRef([]);

  // Navegação por teclado: ↑ ↓ movem a seta; Enter/Espaço ativam (nativo do botão).
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
      e.preventDefault();
      const step = e.code === 'ArrowDown' ? 1 : -1;
      setSelected((current) => {
        const next = (current + step + MENU_ITEMS.length) % MENU_ITEMS.length;
        itemRefs.current[next]?.focus();
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={styles.content}>
        {logoFailed ? (
          <h1 className={styles.fallbackTitle}>GALAGA</h1>
        ) : (
          <img
            className={styles.logo}
            src={LOGO_SRC}
            alt="Galaga"
            onError={() => setLogoFailed(true)}
          />
        )}

        <nav className={styles.menu} aria-label="Menu principal">
          {MENU_ITEMS.map((item, index) => (
            <button
              key={item.to}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              className={styles.item}
              data-selected={selected === index}
              autoFocus={index === 0}
              onMouseEnter={() => itemRefs.current[index]?.focus()}
              onFocus={() => setSelected(index)}
              onClick={() => navigate(item.to)}
            >
              <span className={styles.arrow} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}