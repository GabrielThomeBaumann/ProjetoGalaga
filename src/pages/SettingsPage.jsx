import { useNavigate } from 'react-router-dom';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Configurações</h1>
      <p className={styles.text}>Em breve.</p>
      <button
        type="button"
        className={styles.button}
        onClick={() => navigate('/')}
      >
        Voltar
      </button>
    </section>
  );
}