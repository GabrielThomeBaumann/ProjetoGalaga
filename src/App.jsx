import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './styles/App.module.css';

// Rotas em que a navegação é feita por botões (menu e HUD), sem navbar.
const ROUTES_WITHOUT_NAVBAR = ['/', '/game'];

function linkClass({ isActive }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link;
}

export default function App() {
  const { pathname } = useLocation();
  const hideNavbar = ROUTES_WITHOUT_NAVBAR.includes(pathname);

  return (
    <div className={styles.shell}>
      {!hideNavbar && (
        <nav className={styles.nav}>
          <NavLink to="/" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/game" className={linkClass}>
            Jogo
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            Login
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Configurações
          </NavLink>
        </nav>
      )}
      <main
        className={
          hideNavbar ? `${styles.main} ${styles.mainCentered}` : styles.main
        }
      >
        <Outlet />
      </main>
    </div>
  );
}