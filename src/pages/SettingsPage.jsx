import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarfieldBackground from '../components/StarfieldBackground';
import { applyTheme, getStoredTheme, saveTheme } from '../theme/theme';
import styles from './SettingsPage.module.css';

const OPTIONS = [
  { kind: 'theme', value: 'dark', label: 'Tema Escuro' },
  { kind: 'theme', value: 'light', label: 'Tema Claro' },
  { kind: 'back', label: 'Voltar' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme);
  const [selected, setSelected] = useState(0);
  const itemRefs = useRef([]);

  // ↑ ↓ movem a seta; Enter/Espaço ativam (nativo do botão).
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
      e.preventDefault();
      const step = e.code === 'ArrowDown' ? 1 : -1;
      setSelected((current) => {
        const next = (current + step + OPTIONS.length) % OPTIONS.length;
        itemRefs.current[next]?.focus();
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleActivate = (option) => {
    if (option.kind === 'back') {
      navigate('/');
      return;
    }
    setTheme(option.value);
    applyTheme(option.value);
    saveTheme(option.value);
  };

  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={styles.content}>
        <h1 className={styles.title}>Configurações</h1>

        <nav className={styles.menu} aria-label="Configurações">
          {OPTIONS.map((option, index) => (
            <button
              key={option.label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              className={styles.item}
              data-selected={selected === index}
              data-active={option.kind === 'theme' && theme === option.value}
              autoFocus={index === 0}
              onMouseEnter={() => itemRefs.current[index]?.focus()}
              onFocus={() => setSelected(index)}
              onClick={() => handleActivate(option)}
            >
              <span className={styles.arrow} aria-hidden="true" />
              <span>{option.label}</span>
              {option.kind === 'theme' && (
                <span className={styles.check} aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}