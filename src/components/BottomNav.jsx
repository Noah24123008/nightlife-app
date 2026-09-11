import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/locales', label: 'Locales', end: false },
  { to: '/social', label: 'Social', end: false },
  { to: '/perfil', label: 'Perfil', end: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item--activo' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
