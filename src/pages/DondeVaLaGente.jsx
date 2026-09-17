import { useEffect, useState } from 'react'
import { getDondeVaLaGenteHoy } from '../lib/api'
import { getFechaNocturnaActual } from '../lib/dates'
import LocalHoyCard from '../components/LocalHoyCard'
import BackButton from '../components/BackButton'
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
      const { data, error: errDatos } = await getDondeVaLaGenteHoy(getFechaNocturnaActual())
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
    <div className="app-screen donde-va-v2">
      <div className="donde-va-v2-contenido">
        <BackButton />
        <h1 className="donde-va-v2-titulo">Dónde va la gente hoy</h1>

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
    </div>
  )
}
