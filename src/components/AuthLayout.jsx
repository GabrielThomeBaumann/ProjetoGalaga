import StarfieldBackground from './StarfieldBackground';
import styles from './AuthLayout.module.css';

/**
 * Moldura das telas de conta e ranking (login, cadastro, conta, 404, leaderboard):
 * fundo de estrelas + painel centralizado com título.
 * `wide` deixa o painel mais largo (usado no ranking).
 */
export default function AuthLayout({
  title,
  subtitle = null,
  notice = null,
  footer = null,
  wide = false,
  children,
}) {
  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={wide ? `${styles.panel} ${styles.wide}` : styles.panel}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {children}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </section>
  );
}