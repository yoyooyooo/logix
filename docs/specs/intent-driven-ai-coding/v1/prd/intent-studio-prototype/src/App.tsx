import './styles/global.css'
import { NavLink, Outlet } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/intents', label: 'Intents' },
  { to: '/patterns', label: 'Patterns' },
  { to: '/assets', label: 'Assets' },
]

export default function App() {
  return (
    <div className="app-root">
      <header className="top-nav">
        <div className="brand">Intent Studio</div>
        <nav>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
