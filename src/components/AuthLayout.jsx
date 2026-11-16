import StarfieldBackground from './StarfieldBackground';
import styles from './AuthLayout.module.css';

/**
 * Moldura das telas de conta (login, cadastro, conta, 404):
 * fundo de estrelas + painel centralizado com título.
 */
export default function AuthLayout({
  title,
  subtitle = null,
  notice = null,
  footer = null,
  children,
}) {
  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={styles.panel}>
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