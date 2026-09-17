import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// prefijos: rutas que activan esta pestaña — incluye la propia y cualquier
// ruta de detalle que cuelgue de ella (p. ej. /locales/:id ya activaba
// "Locales" antes; ahora /eventos y /eventos/:id también, porque Eventos
// vive dentro de la sección Locales). exacto:true (solo Inicio) exige
// coincidencia exacta con "/", igual que el end:true que ya tenía antes.
const ITEMS = [
  {
    to: '/',
    label: 'Inicio',
    prefijos: ['/'],
    exacto: true,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v8.5a1 1 0 0 0 1 1H9.5v-5.5h5V19.5H17.5a1 1 0 0 0 1-1V10" />
      </svg>
    ),
  },
  {
    to: '/locales',
    label: 'Locales',
    prefijos: ['/locales', '/eventos', '/mapa'],
    exacto: false,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.4" />
      </svg>
    ),
  },
  {
    to: '/social',
    label: 'Social',
    prefijos: ['/social'],
    exacto: false,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17.2" cy="8" r="2.3" />
        <path d="M15.3 14.3c2.6.5 4.5 2.8 4.5 5.4" />
      </svg>
    ),
  },
  {
    to: '/perfil',
    label: 'Perfil',
    prefijos: ['/perfil'],
    exacto: false,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      </svg>
    ),
  },
]

function esActivo(item, pathname) {
  if (item.exacto) return pathname === item.to
  return item.prefijos.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
}

export default function BottomNav() {
  const { numSolicitudesPendientes } = useAuth()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => {
        const activo = esActivo(item, location.pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav-item ${activo ? 'bottom-nav-item--activo' : ''}`}
          >
            <span className="bottom-nav-icono">
              {item.icon}
              {item.to === '/social' && numSolicitudesPendientes > 0 && (
                <span className="bottom-nav-badge">
                  {numSolicitudesPendientes > 9 ? '9+' : numSolicitudesPendientes}
                </span>
              )}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
