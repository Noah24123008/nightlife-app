import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import LocalesSubnav from '../components/LocalesSubnav'
import Locales from '../pages/Locales'
import Eventos from '../pages/Eventos'
import Mapa from '../pages/Mapa'
import fiestaHero from '../assets/fiestahero.png'

const ACTIVO_POR_RUTA = {
  '/locales': 'locales',
  '/eventos': 'eventos',
  '/mapa': 'mapa',
}

// Hero + selector compartidos por /locales, /eventos y /mapa, y paneles
// persistentes para el contenido: la primera vez que se visita una vista se
// monta (dispara su propio fetch, como siempre); a partir de ahí queda
// montada y solo se oculta/muestra con el atributo `hidden`, sin
// desmontarse ni repetir su useEffect. No se usa <Outlet/> para el
// contenido — este layout ya no se desmonta nunca al cambiar entre estas 3
// rutas (es la garantía de una ruta de layout con hijas anidadas), así que
// el estado de qué se ha visitado vive aquí con seguridad.
export default function LocalesSectionLayout() {
  const location = useLocation()
  const activo = ACTIVO_POR_RUTA[location.pathname] ?? 'locales'

  const [visitados, setVisitados] = useState(() => new Set([activo]))
  useEffect(() => {
    setVisitados((previo) => (previo.has(activo) ? previo : new Set(previo).add(activo)))
  }, [activo])

  return (
    <div className="app-screen locales-v2">
      <div className="locales-v2-hero" style={{ backgroundImage: `url(${fiestaHero})` }}>
        <div className="locales-v2-hero-overlay" aria-hidden="true" />
        <div className="locales-v2-hero-contenido">
          <h1 className="locales-v2-hero-titulo">Gijón</h1>
          <Link to="/notificaciones" className="glass-icon-btn" aria-label="Notificaciones">
            🔔
          </Link>
        </div>
      </div>

      <div className="locales-v2-contenido">
        <LocalesSubnav activo={activo} />

        {visitados.has('locales') && (
          <div hidden={activo !== 'locales'}>
            <Locales />
          </div>
        )}
        {visitados.has('eventos') && (
          <div hidden={activo !== 'eventos'}>
            <Eventos />
          </div>
        )}
        {visitados.has('mapa') && (
          <div hidden={activo !== 'mapa'}>
            <Mapa />
          </div>
        )}
      </div>
    </div>
  )
}
