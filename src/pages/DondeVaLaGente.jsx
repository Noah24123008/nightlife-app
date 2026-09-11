import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDondeVaLaGenteHoy, getMiVotoDelDia } from '../lib/api'
import { toISODate } from '../lib/dates'
import LocalHoyCard from '../components/LocalHoyCard'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function DondeVaLaGente() {
  const { user, signOut } = useAuth()
  const hoyISO = useMemo(() => toISODate(new Date()), [])

  const [locales, setLocales] = useState([])
  const [miVotoLocalId, setMiVotoLocalId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const [{ data, error: errDatos }, { data: miVoto }] = await Promise.all([
        getDondeVaLaGenteHoy(),
        user ? getMiVotoDelDia(user.id, hoyISO) : Promise.resolve({ data: null }),
      ])
      if (!activo) return
      if (errDatos) {
        setError(mensajeError(errDatos, 'No se pudo cargar la actividad de hoy.'))
        if (esErrorDeAutenticacion(errDatos)) setTimeout(() => signOut(), 2000)
      } else {
        setLocales(data ?? [])
      }
      setMiVotoLocalId(miVoto?.local_id ?? null)
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [user?.id, hoyISO])

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
            <LocalHoyCard
              key={local.local_id}
              local={local}
              posicion={index + 1}
              destacado={index === 0}
              yoVotadoAqui={miVotoLocalId === local.local_id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
