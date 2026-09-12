import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCiudadPorNombre, getLocalesPorCiudad } from '../lib/api'
import FotoLocalMiniatura from '../components/FotoLocalMiniatura'
import MapaLocales from '../components/MapaLocales'

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
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Locales en Gijón</span>
      </header>

      {!cargando && locales.length > 0 && (
        <div className="vista-selector">
          <button
            type="button"
            className={`glass-chip ${vista === 'lista' ? 'glass-chip--active' : ''}`}
            onClick={() => setVista('lista')}
          >
            Lista
          </button>
          <button
            type="button"
            className={`glass-chip ${vista === 'mapa' ? 'glass-chip--active' : ''}`}
            onClick={() => setVista('mapa')}
          >
            Mapa
          </button>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando locales...</p>
      ) : locales.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay locales cargados para Gijón.</p>
      ) : vista === 'mapa' ? (
        <MapaLocales locales={locales} />
      ) : (
        <>
          {destacado && (
            <>
              <h2 className="ficha-subtitulo">Destacado este fin de semana</h2>
              <Link to={`/locales/${destacado.id}`} className="local-card local-card--temporal">
                <FotoLocalMiniatura src={destacado.foto_url} alt={destacado.nombre} />
                <span className="local-card-info">
                  <span className="badge-temporal">TEMPORAL</span>
                  <span className="venue-name">{destacado.nombre}</span>
                  <span className="local-categoria">{destacado.categoria}</span>
                  {destacado.direccion && <span className="local-direccion">{destacado.direccion}</span>}
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
                    {local.direccion && <span className="local-direccion">{local.direccion}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
