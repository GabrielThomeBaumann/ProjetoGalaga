import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarfieldBackground from '../components/StarfieldBackground';
import { getVolume, playSound, setVolume } from '../game/sounds';
import { applyTheme, getStoredTheme, saveTheme } from '../theme/theme';
import styles from './SettingsPage.module.css';

const VOLUME_STEPS = 10;

const OPTIONS = [
  { kind: 'theme', value: 'dark', label: 'Tema Escuro' },
  { kind: 'theme', value: 'light', label: 'Tema Claro' },
  { kind: 'volume', label: 'Volume' },
  { kind: 'back', label: 'Voltar' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme);
  const [selected, setSelected] = useState(0);
  const [level, setLevel] = useState(() =>
    Math.round(getVolume() * VOLUME_STEPS),
  );
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

  const changeLevel = (next) => {
    const clamped = Math.min(Math.max(next, 0), VOLUME_STEPS);
    setLevel(clamped);
    setVolume(clamped / VOLUME_STEPS);
    playSound('enemy-kill'); // prévia do volume
  };

  const handleActivate = (option) => {
    if (option.kind === 'back') {
      navigate('/');
      return;
    }
    if (option.kind !== 'theme') return;
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
              {...(option.kind === 'volume' && {
                role: 'slider',
                'aria-valuemin': 0,
                'aria-valuemax': VOLUME_STEPS,
                'aria-valuenow': level,
                onKeyDown: (e) => {
                  if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    changeLevel(level - 1);
                  } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    changeLevel(level + 1);
                  }
                },
              })}
            >
              <span className={styles.arrow} aria-hidden="true" />
              <span>{option.label}</span>
              {option.kind === 'theme' && (
                <span className={styles.check} aria-hidden="true" />
              )}
              {option.kind === 'volume' && (
                <span className={styles.bar} aria-hidden="true">
                  {Array.from({ length: VOLUME_STEPS }, (_, i) => (
                    <span
                      key={i}
                      className={styles.block}
                      data-on={i < level}
                      onClick={() => changeLevel(i + 1)}
                    />
                  ))}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}