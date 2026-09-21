import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/locales', label: 'Locales', end: false },
  { to: '/admin/eventos', label: 'Eventos', end: false },
  { to: '/admin/usuarios', label: 'Usuarios', end: false },
  { to: '/admin/feedback', label: 'Feedback', end: false },
]

export default function AdminLayout() {
  return (
    <div className="admin-v1">
      <header className="admin-v1-header">
        <h1 className="admin-v1-titulo">Administración</h1>
        <p className="admin-v1-subtitulo">Nightlife · Gijón</p>
      </header>

      <nav className="admin-v1-nav">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `admin-v1-tab ${isActive ? 'admin-v1-tab--activo' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-v1-contenido">
        <Outlet />
      </div>
    </div>
  )
}
