import { useEffect, useState } from 'react'
import { getCiudadPorNombre, getLocalesPorCiudad } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'
import MapaLocales from '../components/MapaLocales'

const CIUDAD_ACTUAL = 'Gijón'

export default function Mapa() {
  const { signOut } = useAuth()
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
        setError(mensajeError(errCiudad, 'No se pudo cargar la ciudad de Gijón desde Supabase.'))
        setCargando(false)
        if (esErrorDeAutenticacion(errCiudad)) setTimeout(() => signOut(), 2000)
        return
      }
      const { data, error: errLocales } = await getLocalesPorCiudad(ciudad.id)
      if (!activo) return
      if (errLocales) {
        setError(mensajeError(errLocales, 'No se pudieron cargar los locales.'))
        if (esErrorDeAutenticacion(errLocales)) setTimeout(() => signOut(), 2000)
      } else {
        setLocales(data ?? [])
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
        <span className="screen-title">Mapa</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? <p className="app-loading">Cargando mapa...</p> : <MapaLocales locales={locales} />}
    </div>
  )
}
