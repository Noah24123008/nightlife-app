import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCiudadPorNombre, getLocalesPorCiudad } from '../lib/api'
import FotoLocalMiniatura from '../components/FotoLocalMiniatura'
import MapaLocales from '../components/MapaLocales'
import { SkeletonLocalCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import fiestaHero from '../assets/fiestahero.png'

const CIUDAD_ACTUAL = 'Gijón'

export default function Locales() {
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('lista')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data: ciudad, error: errCiudad } = await getCiudadPorNombre(CIUDAD_ACTUAL)
      if (!activo) return
      if (errCiudad || !ciudad) {
        setError('No se pudo cargar la ciudad de Gijón desde Supabase.')
        setCargando(false)
        return
      }
      const { data, error: errLocales } = await getLocalesPorCiudad(ciudad.id)
      if (!activo) return
      if (errLocales) {
        setError('No se pudieron cargar los locales.')
      } else {
        setLocales((data ?? []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [])

  const destacado = useMemo(
    () => locales.find((local) => local.nombre === 'Fiestas de Cimadevilla'),
    [locales]
  )
  const normales = useMemo(
    () => locales.filter((local) => local.nombre !== 'Fiestas de Cimadevilla'),
    [locales]
  )

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
        {!cargando && locales.length > 0 && (
          <div className="vista-selector">
            <button
              type="button"
              className={`glass-chip ${vista === 'lista' ? 'glass-chip--active' : ''}`}
              onClick={() => setVista('lista')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 6h13M8 12h13M8 18h13" />
                <path d="M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              Lista
            </button>
            <button
              type="button"
              className={`glass-chip ${vista === 'mapa' ? 'glass-chip--active' : ''}`}
              onClick={() => setVista('mapa')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
                <path d="M9 4v14M15 6v14" />
              </svg>
              Mapa
            </button>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        {cargando ? (
          <ul className="locales-lista">
            <li>
              <SkeletonLocalCard />
            </li>
            <li>
              <SkeletonLocalCard />
            </li>
            <li>
              <SkeletonLocalCard />
            </li>
            <li>
              <SkeletonLocalCard />
            </li>
            <li>
              <SkeletonLocalCard />
            </li>
          </ul>
        ) : locales.length === 0 ? (
          <EmptyState titulo="Sin locales todavía" texto="Estamos cargando los locales de Gijón." />
        ) : vista === 'mapa' ? (
          <MapaLocales locales={locales} />
        ) : (
          <>
            {destacado && (
              <>
                <h2 className="ficha-subtitulo">Destacado este fin de semana</h2>
                <Link
                  to={`/locales/${destacado.id}`}
                  className="locales-v2-destacado-card"
                  style={destacado.foto_url ? { backgroundImage: `url(${destacado.foto_url})` } : undefined}
                >
                  <div className="locales-v2-destacado-overlay">
                    <span className="badge-temporal">TEMPORAL</span>
                    <p className="locales-v2-destacado-titulo">{destacado.nombre}</p>
                    <p className="locales-v2-destacado-meta">🎫 {destacado.categoria}</p>
                    {destacado.direccion && (
                      <p className="locales-v2-destacado-meta">📍 {destacado.direccion}</p>
                    )}
                  </div>
                  <span className="locales-v2-destacado-flecha" aria-hidden="true">
                    →
                  </span>
                </Link>
              </>
            )}

            <h2 className="ficha-subtitulo">Todos los locales</h2>
            <ul className="locales-lista">
              {normales.map((local) => (
                <li key={local.id}>
                  <Link to={`/locales/${local.id}`} className="local-card">
                    <FotoLocalMiniatura src={local.foto_url} alt={local.nombre} />
                    <span className="local-card-info">
                      <span className="venue-name">{local.nombre}</span>
                      <span className="local-categoria">{local.categoria}</span>
                      {local.direccion && <span className="local-direccion">📍 {local.direccion}</span>}
                    </span>
                    <span className="locales-v2-chevron" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
