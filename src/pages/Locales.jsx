import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCiudadPorNombre, getLocalesPorCiudad } from '../lib/api'
import FotoLocalMiniatura from '../components/FotoLocalMiniatura'
import { SkeletonLocalCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

const CIUDAD_ACTUAL = 'Gijón'

export default function Locales() {
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

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
    <>
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
    </>
  )
}
