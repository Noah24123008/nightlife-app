import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCiudadPorNombre, getLocalesPorCiudad } from '../lib/api'
import ImagenConFallback from '../components/ImagenConFallback'

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

  return (
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Locales en Gijón</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando locales...</p>
      ) : locales.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay locales cargados para Gijón.</p>
      ) : (
        <ul className="locales-lista">
          {locales.map((local) => (
            <li key={local.id}>
              <Link to={`/locales/${local.id}`} className="local-card">
                <ImagenConFallback
                  src={local.foto_url}
                  alt={local.nombre}
                  className="local-card-foto"
                  placeholderClassName="local-card-foto local-card-foto--vacia"
                />
                <span className="local-card-info">
                  <span className="venue-name">{local.nombre}</span>
                  <span className="local-categoria">{local.categoria}</span>
                  {local.direccion && <span className="local-direccion">{local.direccion}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
