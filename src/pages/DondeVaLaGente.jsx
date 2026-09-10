import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDondeVaLaGenteHoy } from '../lib/api'
import LocalHoyCard from '../components/LocalHoyCard'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function DondeVaLaGente() {
  const { signOut } = useAuth()
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: errDatos } = await getDondeVaLaGenteHoy()
      if (!activo) return
      if (errDatos) {
        setError(mensajeError(errDatos, 'No se pudo cargar la actividad de hoy.'))
        if (esErrorDeAutenticacion(errDatos)) setTimeout(() => signOut(), 2000)
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
      <Link to="/" className="ficha-volver">
        ← Inicio
      </Link>

      <header className="screen-header">
        <span className="screen-title">Dónde va la gente hoy</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando...</p>
      ) : locales.length === 0 ? (
        <p className="inicio-vacio">Todavía nadie ha indicado dónde va hoy</p>
      ) : (
        <ul className="ranking">
          {locales.map((local, index) => (
            <LocalHoyCard key={local.local_id} local={local} posicion={index + 1} destacado={index === 0} />
          ))}
        </ul>
      )}
    </div>
  )
}
