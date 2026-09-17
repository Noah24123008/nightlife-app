import { Link } from 'react-router-dom'

const SEGMENTOS = [
  { id: 'locales', to: '/locales', texto: 'Locales' },
  { id: 'eventos', to: '/eventos', texto: 'Eventos' },
  { id: 'mapa', to: '/mapa', texto: 'Mapa' },
]

// activo: 'locales' | 'eventos' | 'mapa' — cada pantalla lo indica
// explícitamente (no se deriva de la URL aquí dentro), ya que las tres
// viven en rutas separadas y cada una sabe perfectamente cuál es.
export default function LocalesSubnav({ activo }) {
  return (
    <nav className="locales-subnav" aria-label="Ver Locales, Eventos o Mapa">
      {SEGMENTOS.map((seg) => (
        <Link
          key={seg.id}
          to={seg.to}
          className={`locales-subnav-item ${activo === seg.id ? 'locales-subnav-item--activo' : ''}`}
        >
          {seg.texto}
        </Link>
      ))}
    </nav>
  )
}
